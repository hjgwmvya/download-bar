const unload = require("sdk/system/unload");

const { DownloadManager } = require("./DownloadManager.js");
const { DownloadBar } = require("./DownloadBar.js");

let downloadManager = new DownloadManager();
let downloadBar = new DownloadBar();

downloadManager.register();
downloadBar.register();

unload.when(function(reason)
{
    downloadBar.unregister();
    downloadManager.unregister();
});

downloadManager.addDownloadAddedListener(function(download)
{
    downloadBar.updateDownloadButton(download);
});
downloadManager.addDownloadChangedListener(function(download)
{   
    downloadBar.updateDownloadButton(download);
});
downloadManager.addDownloadRemovedListener(function(download)
{
    downloadBar.removeDownloadButton(download);
});
