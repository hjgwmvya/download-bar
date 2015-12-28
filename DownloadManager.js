const { Cu } = require("chrome");
const { Downloads } = Cu.import('resource://gre/modules/Downloads.jsm');

const { Download } = require("./Download.js");

function DownloadManager()
{
    this.registered = false;

    this.ids = new WeakMap();
    this.downloads = new WeakMap();
    this.currentId = 0;
    
    this.downloadAddedListener = [ ];
    this.downloadChangedListener = [ ];
    this.downloadRemovedListener = [ ];
}

DownloadManager.prototype = {
    register: function()
    {
        if (this.registered) return;
    
        this.registered = true;
    
        Downloads.getList(Downloads.ALL)
            .then(list => list.addView(this))
            .then(null, Cu.reportError);
    },
    unregister: function()
    {
        if (!this.registered) return;
    
        this.ids = new WeakMap();
        this.downloads = { };
    
        this.downloadAddedListener = [ ];
        this.downloadChangedListener = [ ];
        this.downloadRemovedListener = [ ];
    
         Downloads.getList(Downloads.ALL)
            .then(list => list.removeView(this))
            .then(null, Cu.reportError);
            
        this.registered = false;
    },
    
    getDownload(downloadId)
    {       
        return this.downloads[downloadId];
    },
    
    createDownload: function(rawDownload)
    {
        let downloadId = this.ids.get(rawDownload);
        if (!downloadId)
        {
            downloadId = "download-" + this.currentId++;
            this.ids.set(rawDownload, downloadId);
            let download = new Download(rawDownload, downloadId);
            this.downloads[downloadId] = download;
            
            const self = this;
            download.addListener(function()
            {
                self.onDownloadChanged(download.rawDownload);
            });
        }
    
        return this.downloads[downloadId];
    },
    
    addDownloadAddedListener: function(listener)
    {
        this.downloadAddedListener.push(listener);
    },
    addDownloadChangedListener: function(listener)
    {
        this.downloadChangedListener.push(listener);
    },
    addDownloadRemovedListener: function(listener)
    {
        this.downloadRemovedListener.push(listener);
    },
    
    onDownloadAdded: function(download)
    {
        for (let listener of this.downloadAddedListener)
        {
            listener(this.createDownload(download));
        }
    },
    onDownloadChanged: function(download)
    {    
        for (let listener of this.downloadChangedListener)
        {
            listener(this.createDownload(download));
        }
    },
    onDownloadRemoved: function(download)
    {
        for (let listener of this.downloadRemovedListener)
        {
            listener(this.createDownload(download));
        }
    },
};

exports.DownloadManager = DownloadManager;