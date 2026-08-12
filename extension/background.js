// Opens the app in a full tab when the toolbar action is clicked.
// Compatible with Chrome (MV3) and Firefox (WebExtensions/MV3).
const api = typeof globalThis.browser !== 'undefined' ? globalThis.browser : globalThis.chrome

api.action.onClicked.addListener(() => {
  api.tabs.create({ url: api.runtime.getURL('app/index.html') })
})
