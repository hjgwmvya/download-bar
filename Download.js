const { Cu, Cc, Ci } = require("chrome");

const { DownloadsCommon } = require("resource:///modules/DownloadsCommon.jsm");
const { FileUtils } = require("resource://gre/modules/FileUtils.jsm");

function Download(rawDownload, id)
{
    this.rawDownload = rawDownload;
    this.id = id;
    this.opened = false;
    this.listener = [ ];
}

Download.prototype = {
    get totalBytes() { return this.rawDownload.totalBytes; },
    get currentBytes() { return this.rawDownload.currentBytes; },
    get url() { return this.rawDownload.source.url; },
    get path() { return this.rawDownload.target.path; },
    get contentType() { return this.rawDownload.contentType; },
    get startTime() { return this.rawDownload.startTime.getTime(); },
    get speed() { return this.rawDownload.speed; },
    get hasPartialData() { return this.rawDownload.hasPartialData; },
    get hasProgress() { return this.rawDownload.hasProgress; },
    get progress() { return this.rawDownload.progress; },
    
    get state()
    {
        if (this.rawDownload.succeeded) return "succeeded";
        if (this.rawDownload.canceled && this.rawDownload.hasPartialData) return "paused";
        if (this.rawDownload.canceled && !this.rawDownload.hasPartialData) return "canceled";
        if (this.rawDownload.error) return "error";
        if (this.rawDownload.stopped) return "stopped";
        
        return "downloading";
    },

    retry: function()
    {
        this.rawDownload.start().catch(() => {});
    },
    
    resume: function()
    {    
        this.rawDownload.start();
    },
    
    pause: function()
    {
        this.rawDownload.cancel();
    },
    
    cancel: function()
    {
        this.rawDownload.cancel().catch(() => {});
        this.rawDownload.removePartialData().catch(Cu.reportError);
    },
    
    open: function(window)
    {
        if (!this.rawDownload.succeeded) return;
    
        this.opened = true; 
    
        let file = new FileUtils.File(this.rawDownload.target.path);
        DownloadsCommon.openDownloadedFile(file, null, window);
        
        this.notifyListener();
    },
    
    openFolder: function()
    {
        let file = new FileUtils.File(this.rawDownload.target.path);
        DownloadsCommon.showDownloadedFile(file);
    },
    
    copyLocation: function()
    {
        let clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);
        clipboard.copyString(this.rawDownload.source.url);
    },
    
    remove: function()
    {
        DownloadsCommon.removeAndFinalizeDownload(this.rawDownload);
    },
    
    addListener: function(listener)
    {
        this.listener.push(listener);
    },
    notifyListener: function()
    {
        for (let index in this.listener)
        {
            let listener = this.listener[index];
            listener(this);
        }
    },
};

exports.Download = Download;