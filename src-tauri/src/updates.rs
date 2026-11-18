//! UpdatesPort's Tauri side (src/adapters/updates/tauri, ADR 0033 amended by ADR 0046). Checks the channel's
//! manifest, downloads the offered version and checks its signature against the key the build carries, and
//! installs only what was downloaded and verified. A build without the key has no updater.

use serde::Serialize;
use std::sync::Mutex;
use tauri::{ipc::Channel, AppHandle, State};
use tauri_plugin_updater::{Update, UpdaterExt};

/// Where Studio's releases are.
const REPOSITORY: &str = "tutors-sdk/tutors-studio";

#[derive(Default)]
pub struct Pending {
    update: Option<Update>,
    bytes: Option<Vec<u8>>,
}

pub struct UpdateState(pub Mutex<Pending>);

#[derive(Serialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Found {
    version: String,
    notes: String,
    tutors: Option<String>,
}

/// The manifest a channel reads: Stable, latest.json on the latest release; Beta, beta.json on the rolling
/// `channel-beta` release, which every release (Beta or Stable) refreshes.
pub fn endpoint(channel: &str) -> String {
    match channel {
        "beta" => format!("https://github.com/{REPOSITORY}/releases/download/channel-beta/beta.json"),
        _ => format!("https://github.com/{REPOSITORY}/releases/latest/download/latest.json"),
    }
}

/// The Tutors release a manifest says is inside the version it offers (scripts/update-manifest.mjs writes it).
pub fn tutors_in(raw: &serde_json::Value) -> Option<String> {
    raw.get("tutors").and_then(|tutors| tutors.as_str()).map(str::to_string)
}

#[tauri::command]
pub async fn update_check(app: AppHandle, state: State<'_, UpdateState>, channel: String) -> Result<Option<Found>, String> {
    if !app.config().plugins.0.contains_key("updater") {
        return Err("unavailable".into());
    }
    let url = tauri::Url::parse(&endpoint(&channel)).map_err(|e| e.to_string())?;
    let updater = app.updater_builder().endpoints(vec![url]).map_err(|e| e.to_string())?.build().map_err(|e| e.to_string())?;
    let found = updater.check().await.map_err(|e| e.to_string())?;
    let answer = found.as_ref().map(|update| Found { version: update.version.clone(), notes: update.body.clone().unwrap_or_default(), tutors: tutors_in(&update.raw_json) });
    let mut pending = state.0.lock().map_err(|e| e.to_string())?;
    *pending = Pending { update: found, bytes: None };
    Ok(answer)
}

/// Downloads the offered version; the updater checks its signature, and one that doesn't match is discarded.
#[tauri::command]
pub async fn update_download(state: State<'_, UpdateState>, progress: Channel<f64>) -> Result<(), String> {
    let update = state.0.lock().map_err(|e| e.to_string())?.update.clone().ok_or("there is no newer version to install")?;
    let mut done: u64 = 0;
    let downloaded = update
        .download(
            |chunk, total| {
                done += chunk as u64;
                if let Some(total) = total.filter(|total| *total > 0) {
                    let _ = progress.send((done as f64 / total as f64).min(1.0));
                }
            },
            || {},
        )
        .await;
    let mut pending = state.0.lock().map_err(|e| e.to_string())?;
    match downloaded {
        Ok(bytes) => {
            pending.bytes = Some(bytes);
            Ok(())
        }
        Err(error) => {
            *pending = Pending::default();
            Err(error.to_string())
        }
    }
}

/// Installs the version downloaded and verified before; nothing else.
#[tauri::command]
pub fn update_install(state: State<'_, UpdateState>) -> Result<(), String> {
    let mut pending = state.0.lock().map_err(|e| e.to_string())?;
    let (Some(update), Some(bytes)) = (pending.update.take(), pending.bytes.take()) else {
        return Err("download the new version first".into());
    };
    update.install(bytes).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn each_channel_reads_its_own_manifest() {
        assert_eq!(endpoint("stable"), "https://github.com/tutors-sdk/tutors-studio/releases/latest/download/latest.json");
        assert_eq!(endpoint("beta"), "https://github.com/tutors-sdk/tutors-studio/releases/download/channel-beta/beta.json");
        assert_eq!(endpoint("anything else"), endpoint("stable"));
    }

    #[test]
    fn reads_the_tutors_release_inside() {
        assert_eq!(tutors_in(&serde_json::json!({ "version": "0.3.0", "tutors": "17.2.0" })), Some("17.2.0".into()));
        assert_eq!(tutors_in(&serde_json::json!({ "version": "0.3.0" })), None);
    }
}
