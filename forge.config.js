module.exports = {
  packagerConfig: {
    asar: true,
    name: 'finance paper',
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'finance_paper',
        setupExe: 'finance paper.exe',
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