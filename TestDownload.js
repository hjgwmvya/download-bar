function TestDownload(downloadBar, id)
{
    this.downloadBar = downloadBar;
    this.id = id;
    this.opened = false;
    this.totalBytes = 0;
    this.currentBytes = 0;
    this.url = "";
    this.path = "";
    this.contentType = "";
    this.startTime = 0;
    this.speed = 0;
    this.hasPartialData = false;
    this.hasProgress = true;
    this.progress = 100;
    this.state = "succeeded";
    this.url = "";
}

TestDownload.prototype = {    
    retry: function()
    {
    },
    
    resume: function()
    {    
    },
    
    pause: function()
    {
    },
    
    cancel: function()
    {
    },
    
    open: function(window)
    {
    },
    
    openFolder: function()
    {
    },
    
    copyLocation: function()
    {
    },
    
    remove: function()
    {
        this.downloadBar.removeDownloadButton(this);
    },
    
    addListener: function(listener)
    {
    },
    notifyListener: function()
    {
    },
};

exports.TestDownload = TestDownload;