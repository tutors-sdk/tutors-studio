# Installing Tutors Studio

Studio is one download and a couple of clicks. You do not need administrator rights, a terminal, or anything else installed first.

## 1. Download the file for your computer

| Your computer                   | Download                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Mac (macOS 11 Big Sur or later) | [Tutors-Studio-macOS.dmg](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-macOS.dmg)                 |
| Windows 10 or 11                | [Tutors-Studio-Windows-setup.exe](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-Windows-setup.exe) |
| Ubuntu, Debian or Mint          | [Tutors-Studio-Linux.deb](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-Linux.deb)                 |
| Any other Linux                 | [Tutors-Studio-Linux.AppImage](https://github.com/tutors-sdk/tutors-studio/releases/latest/download/Tutors-Studio-Linux.AppImage)       |

These links always give you the newest version. Not sure which Mac you have? It does not matter: the same file works on Intel and Apple silicon Macs.

## 2. Install it

**Mac.** Open the downloaded file. A window shows the Studio icon and your Applications folder: drag the icon onto the folder. Then open Studio from Launchpad or your Applications folder.

**Windows.** Open the downloaded file. Studio installs for you alone, so Windows does not ask for an administrator password. When it finishes, Studio is in the Start menu.

**Ubuntu, Debian or Mint.** Double-click the downloaded file. The App Center (or Software) opens: click **Install**. If a different app opens, right-click the file and choose **Open With**, then **App Center** or **Software Install**. Studio then appears with your other applications.

**Any other Linux.** Right-click the downloaded file, choose **Properties**, tick **Allow executing file as program**, then double-click it.

## If your computer asks whether to open it

Until Studio's installers are signed, your computer will check with you the first time. This happens once.

**Mac** says Apple could not check Studio. Click **Done**, then open **System Settings**, choose **Privacy & Security**, scroll down to the message about Tutors Studio, and click **Open Anyway**. Enter your Mac password if asked. From then on Studio opens normally.

**Windows** may show a blue box saying it protected your PC. Click **More info**, then **Run anyway**.

**AppImage on newer Ubuntu** may do nothing when double-clicked. Use the `.deb` file above instead; it installs everything Studio needs.

## Updating

Download the newest file from the same link and install it over the top. Your courses live in your own folders and are never touched by installing, updating or removing Studio.

## Removing Studio

- **Mac:** drag Tutors Studio from Applications to the Bin.
- **Windows:** Settings, then Apps, then Tutors Studio, then Uninstall.
- **Ubuntu, Debian or Mint:** open the Software app, find Tutors Studio, click Remove.

## For IT departments

A Windows `.msi` that installs for every user of a machine is attached to each [release](https://github.com/tutors-sdk/tutors-studio/releases/latest), with `SHA256SUMS.txt` for checking downloads. Studio needs Microsoft Edge WebView2, which Windows 10 and 11 already include; if a machine lacks it, the installer fetches it quietly.

## Still stuck?

[Open an issue](https://github.com/tutors-sdk/tutors-studio/issues/new) and say which computer you have and what you saw. A screenshot helps most.
