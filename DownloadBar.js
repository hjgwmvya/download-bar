const { data } = require("sdk/self");
const { windows } = require('sdk/window/utils');
const { observer } = require('sdk/windows/observer');
const { loadSheet } = require("sdk/stylesheet/utils");
const simplePrefs = require('sdk/simple-prefs');
const _ = require("sdk/l10n").get;

const { isBrowserWindow, formatNumber, formatSize, getTimeLeft, formatTime } = require("./utils.js");
const { DownloadBarMenu } = require("./DownloadBarMenu.js");
const { DownloadMenu } = require("./DownloadMenu.js");

const MAX_DOWNLOAD_BUTTONS = 10;

const FILE_STYLE = "default.css";

const ID_DOWNLOAD_BAR = "download-bar-hjgwmvya-download-bar";

const CLASS_DOWNLOAD_BAR = "download-bar-hjgwmvya-download-bar";
const CLASS_CLOSE_BUTTON = "download-bar-hjgwmvya-close-button";
const CLASS_DOWNLOAD_CONTAINER = "download-bar-hjgwmvya-download-container";
const CLASS_DOWNLOAD_BUTTON = "download-bar-hjgwmvya-download-button";
const CLASS_DOWNLOAD_BUTTON_BORDER = "download-bar-hjgwmvya-download-button-border";
const CLASS_DOWNLOAD_BUTTON_BORDER_PUSHED = "download-bar-hjgwmvya-download-button-border-pushed";
const CLASS_DOWNLOAD_BUTTON_BODY = "download-bar-hjgwmvya-download-button-body";
const CLASS_DOWNLOAD_BUTTON_TEXT = "download-bar-hjgwmvya-download-button-text";
const CLASS_DOWNLOAD_BUTTON_DROPMARKER = "download-bar-hjgwmvya-download-button-dropmarker";
const CLASS_DOWNLOAD_BUTTON_DROPMARKER_ICON = "download-bar-hjgwmvya-download-button-dropmarker-icon";

const COLOR_DOWNLOAD_PROGRESS = "yellow";
const COLOR_DOWNLOAD_SUCCEEDED = "yellow";
const COLOR_DOWNLOAD_PAUSED = "yellow";
const COLOR_DOWNLOAD_OPENED = "#FFFF55";
const COLOR_DOWNLOAD_FAILED = "#FF5555";

const STATES = [ "progress", "succeeded", "paused", "opened", "failed" ];

function DownloadBar()
{
    this.registered = false;
    this.downloads = { };
    this.downloadIds = [ ];
    
    this.colors = { };
    this.onPrefChangedHandler = { };
}
  
DownloadBar.prototype = {
    register: function()
    {
        if (this.registered) return;
        this.registered = true;
       
        const self = this;
       
        for (let index in STATES)
        {
            let state = STATES[index];
            this.colors[state] = simplePrefs.prefs["color-" + state];

            this.onPrefChangedHandler[state] = function()
            {
                self.colors[state] = simplePrefs.prefs["color-" + state];
                self.updateAllDownloadButtons();
            };
            
            simplePrefs.on("color-" + state, this.onPrefChangedHandler[state]);
        }
        
        this.handleWindowOpened = function(window)
        {
            if (!isBrowserWindow(window)) return;
            
            self.createDownloadBar(window);
        };
    
        this.handleWindowClosed = function(window)
        {
            if (!isBrowserWindow(window)) return;
            
            self.destroyDownloadBar(window);
        };

        observer.on('open', this.handleWindowOpened);
        observer.on('close', this.handleWindowClosed);
        
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.handleWindowOpened(window);
        }
    },
    unregister: function()
    {
        if (!this.registered) return;
        this.registered = false;
        
        for (let index in STATES)
        {
            let state = STATES[index];            
            simplePrefs.removeListener("color-" + state, this.onPrefChangedHandler[state]);
            this.onPrefChangedHandler[state] = null;
        }
        
        observer.off('open', this.handleWindowOpened);
        observer.off('close', this.handleWindowClosed);
        
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.handleWindowClosed(window);
        }
    },
    
    closeDownloadBar: function()
    {
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.closeDownloadBarInternal(window);
        }
    },
    
    updateAllDownloadButtons: function()
    {
        for (let index in this.downloads)
        {
            let download = this.downloads[index];
            this.updateDownloadButton(download);
        }
    },
    
    updateDownloadButton: function(download)
    {
        this.addDownload(download);
    
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.updateDownloadButtonInternal(window, download);
        }
    },
    
    removeDownloadButton: function(download)
    {
        this.removeDownload(download);
    
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.removeDownloadButtonInternal(window, download);
        }
    },
    
    addDownload: function(download)
    {
        if (this.downloads[download.id]) return;
    
        this.downloads[download.id] = download;
        this.downloadIds.push(download.id);
        
        while (this.downloadIds.length > MAX_DOWNLOAD_BUTTONS)
        {
            this.removeDownloadButton(this.downloads[this.downloadIds[0]]);
        }
    },
    
    removeDownload: function(download)
    {
        this.removeDownloadInernal(download.id);
    },
    
    removeDownloadInernal: function(downloadId)
    {
        if (!this.downloads[downloadId]) return;
        
        delete this.downloads[downloadId];
        for (let index = this.downloadIds.length - 1; index >= 0; index--)
        {
            if (this.downloadIds[index] != downloadId) continue;
            
            this.downloadIds.splice(index, 1);
            break;
        }
    },
    
    onDownloadBarClick: function(event, window)
    {
        event.stopPropagation();
    
        if (event.button == 2)
        {
            let downloadBar = window.document.getElementById(ID_DOWNLOAD_BAR);
            downloadBar.downloadBarMenu.showMenu(this.downloads, event.screenX, event.screenY, true);
        }
    },
    
    createDownloadBar: function(window)
    {
        const self = this;
        
        let document = window.document;
    
        loadSheet(window, data.url(FILE_STYLE), "user");
    
        let bottomBox = document.getElementById("browser-bottombox");
        let downloadBar = document.createElement("toolbar");
        downloadBar.hidden = true;
        downloadBar.setAttribute("id", ID_DOWNLOAD_BAR);
        downloadBar.classList.add("toolbar-primary");
        downloadBar.classList.add(CLASS_DOWNLOAD_BAR);
        downloadBar.addEventListener("click", function(event)
        {
            self.onDownloadBarClick(event, window);
        }, false);
        bottomBox.appendChild(downloadBar);
        
        downloadBar.downloadBarMenu = new DownloadBarMenu(document);
        
        let downloadContainer = document.createElement("hbox");
        downloadContainer.classList.add(CLASS_DOWNLOAD_CONTAINER);        
        downloadContainer.setAttribute("flex", "1");
        downloadBar.appendChild(downloadContainer);
        downloadBar.downloadContainer = downloadContainer;
        
        let spacer = document.createElement("spacer");
        spacer.setAttribute("flex", "1");
        downloadContainer.appendChild(spacer);
        
        let closeButton = document.createElement("toolbarbutton");
        closeButton.classList.add("close-icon");
        closeButton.classList.add("tabbable");
        closeButton.classList.add(CLASS_CLOSE_BUTTON);
        closeButton.setAttribute("tooltiptext", _("close"));
        closeButton.addEventListener("click", function(event)
        {
            self.closeDownloadBar();
        }, false);
        downloadBar.appendChild(closeButton);
        
        downloadBar.downloadMenu = new DownloadMenu(document);
        downloadBar.downloadMenu.addPopupShowingEventListener(function({ download, isContextMenu })
        {
            if (isContextMenu) return;
        
            let dropDownMarker = document.querySelector("#" + download.id + " ." + CLASS_DOWNLOAD_BUTTON_DROPMARKER);
            dropDownMarker.classList.add(CLASS_DOWNLOAD_BUTTON_BORDER_PUSHED);
        });
        downloadBar.downloadMenu.addPopupHidingEventListener(function({ download, isContextMenu })
        {
            if (isContextMenu) return;
        
            let dropDownMarker = document.querySelector("#" + download.id + " ." + CLASS_DOWNLOAD_BUTTON_DROPMARKER);
            dropDownMarker.classList.remove(CLASS_DOWNLOAD_BUTTON_BORDER_PUSHED);        
        });
        
        for (let index in this.downloads)
        {
            let download = this.downloads[index];
            this.updateDownloadButtonInternal(window, download);
        }
    },
    
    destroyDownloadBar: function(window)
    {
        let downloadBar = window.document.getElementById(ID_DOWNLOAD_BAR);
        downloadBar.parentNode.removeChild(downloadBar);
    },
    
    onDownloadButtonClick: function(event, download, window)
    {
        event.stopPropagation();
    
        if (event.button == 0)
        {
            const stateCommandMap = {
                paused: function() { download.resume(); },
                downloading: function() { download.pause(); },
                canceled: function() { download.retry(); },
                error: function() { download.retry(); },
                succeeded: function() { download.open(window); },
            };
        
            let command = stateCommandMap[download.state];
            if (command)
            {
                command();
            }
        }
        
        if (event.button == 2)
        {
            let downloadBar = window.document.getElementById(ID_DOWNLOAD_BAR);
            downloadBar.downloadMenu.showMenu({ download: download, downloads: this.downloads }, event.screenX, event.screenY, true);
        }
    },
    
    onDropButtonClick: function(event, download, window, downloadButtonDropMarker)
    {
        event.stopPropagation();
    
        if (event.button == 0)
        {
            let rectangle = downloadButtonDropMarker.getBoundingClientRect();
            let x = window.mozInnerScreenX + rectangle.left + rectangle.width;
            let y = window.mozInnerScreenY + rectangle.top;
            
            let downloadBar = window.document.getElementById(ID_DOWNLOAD_BAR);
            downloadBar.downloadMenu.showMenu({ download: download, downloads: this.downloads }, x, y, false);
        }
        
        if (event.button == 2)
        {
            let downloadBar = window.document.getElementById(ID_DOWNLOAD_BAR);
            downloadBar.downloadMenu.showMenu({ download: download, downloads: this.downloads }, event.screenX, event.screenY, true);
        }
    },
    
    createDownloadButton: function(window, download)
    {
        const self = this;
        
        let document = window.document;
        let downloadBar = document.getElementById(ID_DOWNLOAD_BAR);
        let downloadContainer = downloadBar.downloadContainer;
    
        downloadBar.hidden = false;
    
        let downloadButton = document.createElement("hbox");
        downloadButton.setAttribute("id", download.id);
        downloadButton.classList.add(CLASS_DOWNLOAD_BUTTON);
        downloadButton.setAttribute("tooltiptext", download.url);
        if (downloadContainer.hasChildNodes())
        {
            downloadContainer.insertBefore(downloadButton, downloadContainer.firstChild);
        }
        else
        {
            downloadContainer.appendChild(downloadButton);
        }
    
        downloadButton.body = document.createElement("vbox");
        downloadButton.body.classList.add(CLASS_DOWNLOAD_BUTTON_BORDER);
        downloadButton.body.classList.add(CLASS_DOWNLOAD_BUTTON_BODY);
        downloadButton.body.addEventListener("click", function(event)
        {
            self.onDownloadButtonClick(event, download, window);
        }, false);
        downloadButton.body.style.width = "0";
        downloadButton.appendChild(downloadButton.body);
        
        let downloadButtonText1 = document.createElement("label");
        downloadButtonText1.classList.add(CLASS_DOWNLOAD_BUTTON_TEXT);
        downloadButtonText1.classList.add("url");
        downloadButtonText1.setAttribute("crop", "center");
        downloadButtonText1.setAttribute("value", download.url);
        downloadButton.body.appendChild(downloadButtonText1);
        
        let downloadButtonText2 = document.createElement("label");
        downloadButtonText2.classList.add(CLASS_DOWNLOAD_BUTTON_TEXT);
        downloadButtonText2.classList.add("state");
        downloadButtonText2.setAttribute("value", "");
        downloadButton.body.appendChild(downloadButtonText2);
        
        let downloadButtonDropMarker = document.createElement("box");
        downloadButtonDropMarker.classList.add(CLASS_DOWNLOAD_BUTTON_BORDER);
        downloadButtonDropMarker.classList.add(CLASS_DOWNLOAD_BUTTON_DROPMARKER);
        downloadButtonDropMarker.addEventListener("click", function(event)
        {
            self.onDropButtonClick(event, download, window, downloadButtonDropMarker);
        }, false);
        downloadButton.appendChild(downloadButtonDropMarker);
        
        let downloadButtonDropMarkerIcon = document.createElement("box");
        downloadButtonDropMarkerIcon.classList.add(CLASS_DOWNLOAD_BUTTON_DROPMARKER_ICON);
        downloadButtonDropMarker.appendChild(downloadButtonDropMarkerIcon);
        
        downloadButton.body.style.width = "";
        
        return downloadButton;
    },
    
    updateDownloadButtonInternal: function(window, download)
    {
        if (!isBrowserWindow(window)) return;
    
        let document = window.document;
        let downloadBar = document.getElementById(ID_DOWNLOAD_BAR);
        if (!downloadBar) return;
        
        let downloadButton = document.getElementById(download.id);
        
        if (!downloadButton)
        {
            downloadButton = this.createDownloadButton(window, download);
        }
        
        let textNode = document.querySelector("#" + download.id + " ." + CLASS_DOWNLOAD_BUTTON_TEXT + ".state");
        if (download.hasProgress)
        {
            if (download.state == "error" || download.state == "canceled")
            {
                downloadButton.style.background = "linear-gradient(90deg, " + this.colors.failed + " " + download.progress + "%, transparent " + download.progress + "%)";
            }
            else if (download.state == "paused")
            {
                downloadButton.style.background = "linear-gradient(90deg, " + this.colors.paused + " " + download.progress + "%, transparent " + download.progress + "%)";
            }
            else if (download.state == "succeeded" && !download.opened)
            {
                downloadButton.style.background = this.colors.succeeded;
            }
            else if (download.state == "succeeded" && download.opened)
            {
                downloadButton.style.background = this.colors.opened;
            }
            else
            {
                downloadButton.style.background = "linear-gradient(90deg, " + this.colors.progress + " " + download.progress + "%, transparent " + download.progress + "%)";
            }
        
            let downloadState = (download.state != "downloading") ? _("state-" + download.state) : formatTime(getTimeLeft(download.currentBytes, download.totalBytes, download.speed));
            textNode.setAttribute("value", download.progress + "% (" + formatSize(download.currentBytes, download.totalBytes) + ") - " + downloadState);
        }
        else
        {
            if (download.state == "error" || download.state == "canceled")
            {
                downloadButton.style.background = this.colors.failed;
            }
            else if (download.state == "succeeded" && !download.opened)
            {
                downloadButton.style.background = this.colors.succeeded;
            }
            else if (download.state == "succeeded" && download.opened)
            {
                downloadButton.style.background = this.colors.opened;
            }
            else
            {
                downloadButton.style.background = "";
            }
            
            let downloadState = (download.state != "downloading") ? _("state-" + download.state) : formatNumber(formatSize(download.speed)) + "/s";
            textNode.setAttribute("value", formatSize(download.currentBytes, null) + " - " + downloadState);
        }
    },

    removeDownloadButtonInternal: function(window, download)
    {
        const self = this;
    
        if (!isBrowserWindow(window)) return;
    
        let document = window.document;
    
        let downloadBar = document.getElementById(ID_DOWNLOAD_BAR);
        if (!downloadBar) return;
        
        let downloadContainer = downloadBar.downloadContainer;
        
        let downloadButton = document.getElementById(download.id);
        if (!downloadButton) return;
        
        downloadButton.addEventListener("transitionend", function()
        {
            downloadContainer.removeChild(downloadButton);
            
            if (self.downloadIds.length == 0)
            {
                downloadBar.hidden = true;
            }
        }, false);
        downloadButton.body.style.width = "0";
    },
    
    closeDownloadBarInternal: function(window)
    {
        const self = this;
    
        if (!isBrowserWindow(window)) return;
    
        let document = window.document;
    
        let downloadBar = document.getElementById(ID_DOWNLOAD_BAR);
        if (!downloadBar) return;
        
        downloadBar.hidden = true;
    },
};

exports.DownloadBar = DownloadBar;