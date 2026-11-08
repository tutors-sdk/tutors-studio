import type { Appearance } from "../../domain/appearance.ts";
import type { EnvVar } from "../../domain/environment.ts";

/** One variable as Settings shows it: a secret's value is never read back, only whether it is set. */
export type EnvSetting = EnvVar & ({ secret: false; value: string } | { secret: true; isSet: boolean });

/** Driving port: the lecturer's Settings screen, and what other use cases read from it. */
export interface PreferencesPort {
  appearance(): Promise<Appearance>;
  setAppearance(appearance: Appearance): Promise<void>;
  environment(): Promise<EnvSetting[]>;
  /** Sets one variable; a secret goes to the keychain. An empty value clears it. */
  setVariable(name: string, value: string): Promise<void>;
  /** What the Tutors reader on this computer gets, secrets included. */
  readerEnvironment(): Promise<Record<string, string>>;
}
