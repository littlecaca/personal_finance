module.exports = {
  packagerConfig: {
    asar: true,
    name: 'finance paper',
    icon: './logo'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'finance_paper',
        setupExe: 'finance paper.exe',
        setupIcon: './logo.ico',
        authors: 'Finance Tracker',
        description: 'finance paper-金融手账'
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32'],
    }
  ],
};