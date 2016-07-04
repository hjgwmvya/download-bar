const { data } = require("sdk/self");
const { windows } = require('sdk/window/utils');
const { observer } = require('sdk/windows/observer');
const { loadSheet } = require("sdk/stylesheet/utils");
const simplePrefs = require('sdk/simple-prefs');
const _ = require("sdk/l10n").get;

const { isBrowserWindow, formatNumber, formatSize, getTimeLeft, formatTime } = require("./utils.js");
const { DownloadBarMenu } = require("./DownloadBarMenu.js");
const { DownloadMenu } = require("./DownloadMenu.js");
const { dashify } = require("./utils.js");
const { TestDownload } = require("./TestDownload.js");

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

const DOWNLOAD_BUTTON_DUMMY_NAME = "dummy";

function DownloadBar()
{
    this.registered = false;
    this.downloads = { };
    this.downloadIds = [ ];
    
    this.settings =
    {
        showAtStart: null,
        hideIfEmpty: null,
        clearOnClose: null,
        hideAutoOpeningDownloads: null,
        downloadButtonText: null,
        showCloseButton: null,
        useAnimations: null,
        buttonWidth: null,
        fontFamily: null,
        fontFamilyCustom: null,
        fontSize: 0,
        fontColor: null,
        fontColorCustom: null,
        stateColorProgress: null,
        stateColorProgressCustom: null,
        stateColorSucceeded: null,
        stateColorSucceededCustom: null,
        stateColorPaused: null,
        stateColorPausedCustom: null,
        stateColorOpened: null,
        stateColorOpenedCustom: null,
        stateColorFailed: null,
        stateColorFailedCustom: null,
    };
    this.onSettingChangedHandler = { };
}

DownloadBar.prototype = {
    register: function()
    {
        if (this.registered) return;
        this.registered = true;
       
        const self = this;

        let bindSettings = function(source, target, both)
        {
            let sourceProperty = dashify(source);
            let targetProperty = dashify(target);
            
            self.onSettingChangedHandler["bind-" + source + "-" + target] = function()
            {
                if (simplePrefs.prefs[targetProperty] == simplePrefs.prefs[sourceProperty])
                    return;
                
                simplePrefs.prefs[targetProperty] = simplePrefs.prefs[sourceProperty];
            };
            simplePrefs.on(sourceProperty, self.onSettingChangedHandler["bind-" + source + "-" + target]);
            
            if (both)
            {
                bindSettings(target, source, false);
            }
        };
        bindSettings("fontColor", "fontColorCustom", true);
        bindSettings("stateColorProgress", "stateColorProgressCustom", true);
        bindSettings("stateColorSucceeded", "stateColorSucceededCustom", true);
        bindSettings("stateColorPaused", "stateColorPausedCustom", true);
        bindSettings("stateColorOpened", "stateColorOpenedCustom", true);
        bindSettings("stateColorFailed", "stateColorFailedCustom", true);
        
        let registerSettingChangedListener = function(settingName)
        {
            let propertyName = dashify(settingName);
           
            self.settings[settingName] = simplePrefs.prefs[propertyName];
            self.onSettingChangedHandler[propertyName] = function()
            {
                self.settings[settingName] = simplePrefs.prefs[propertyName];
                self.updateUi();
            };
            simplePrefs.on(propertyName, self.onSettingChangedHandler[propertyName]);
        };
       
        for (let settingName in this.settings)
        {
            registerSettingChangedListener(settingName);
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
        
        let createTestDownload = function(id, text, opened, state)
        {
            let download = new TestDownload(self, id);
            download.opened = opened;
            download.totalBytes = 1000000;
            download.currentBytes = (state != "succeeded") ? download.totalBytes / 2 : download.totalBytes;
            download.url = text;
            download.speed = 0;
            download.hasProgress = (state != "succeeded");
            download.progress = (state != "succeeded") ? 50 : 100;
            download.state = state;
            
            self.updateDownloadButton(download);
        };
        
        simplePrefs.on("show-test-downloads", function()
        {        
            self.showDownloadBar();
            createTestDownload("test-canceled", _("test-canceled"), false, "canceled");
            createTestDownload("test-opened", _("test-opened"), true, "succeeded");
            createTestDownload("test-succeeded", _("test-succeeded"), false, "succeeded");
            createTestDownload("test-stopped", _("test-stopped"), false, "stopped");
            createTestDownload("test-paused", _("test-paused"), false, "paused");
            createTestDownload("test-downloading", _("test-downloading"), false, "downloading");
        });
        simplePrefs.on("hide-test-downloads", function()
        {        
            self.removeDownloadButton({ id: "test-canceled" });
            self.removeDownloadButton({ id: "test-opened" });
            self.removeDownloadButton({ id: "test-succeeded" });
            self.removeDownloadButton({ id: "test-stopped" });
            self.removeDownloadButton({ id: "test-paused" });
            self.removeDownloadButton({ id: "test-downloading" });
        });
        
        if (this.settings.showAtStart)
        {
            this.showDownloadBar();
        }
    },
    unregister: function()
    {
        if (!this.registered) return;
        this.registered = false;
               
        for (let propertyName in this.onSettingChangedHandler)
        {
            simplePrefs.removeListener(propertyName, this.onSettingChangedHandler[propertyName]);
            delete this.onSettingChangedHandler[propertyName];
        }
        
        observer.off('open', this.handleWindowOpened);
        observer.off('close', this.handleWindowClosed);
        
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.handleWindowClosed(window);
        }
    },
          
    showDownloadBar: function()
    {
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            let document = window.document;
            let downloadBar = document.getElementById(ID_DOWNLOAD_BAR);
            
            downloadBar.hidden = false;
        }
    },
          
    updateUi: function()
    {
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            if (!isBrowserWindow(window)) continue;
            
            this.updateUiInternal(window);
        }
    },
    
    updateUiInternal: function(window)
    {   
        this.updateDownloadButtonInternal(window, { id: DOWNLOAD_BUTTON_DUMMY_NAME });
        for (let id in this.downloads)
        {
            let download = this.downloads[id];
            this.updateDownloadButtonInternal(window, download);
        }
               
        let document = window.document;
        
        let closeButton = document.querySelector("." + CLASS_CLOSE_BUTTON);
        if (closeButton)
        {
            closeButton.hidden = !this.settings.showCloseButton;
        }
                
        if (this.settings.hideIfEmpty && this.downloadIds.length == 0)
        {
            let downloadBar = document.getElementById(ID_DOWNLOAD_BAR);
            if (downloadBar)
            {
                downloadBar.hidden = true;
            }
        }
    },
    
    updateDownloadButton: function(download)
    {
        this.addDownload(download);
    
        if (!this.downloads[download.id]) return;
    
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.updateDownloadButtonInternal(window, download);
        }
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

        let downloadUrlOrPath = (this.settings.downloadButtonText == "url") ? download.url : download.path;
        downloadButton.setAttribute("tooltiptext", downloadUrlOrPath);
        downloadButton.Text.setAttribute("value", downloadUrlOrPath);
        
        downloadButton.body.style.fontFamily = (this.settings.fontFamily != "(Custom)") ? this.settings.fontFamily : this.settings.fontFamilyCustom;
        downloadButton.body.style.fontSize = (this.settings.fontSize > 0) ? this.settings.fontSize + "px" : "90%";
        downloadButton.body.style.color = (this.settings.fontColorCustom) ? this.settings.fontColorCustom : "inherit";
        downloadButton.body.style.transition = (this.settings.useAnimations) ? "width 230ms ease-out" : null;
        downloadButton.body.style.width = (this.settings.buttonWidth > 0) ? this.settings.buttonWidth + "px" : "200px";
        
        let textNode = document.querySelector("#" + download.id + " ." + CLASS_DOWNLOAD_BUTTON_TEXT + ".state");
        
        if (download.hasProgress)
        {
            if (download.state == "error" || download.state == "canceled")
            {
                downloadButton.style.background = "linear-gradient(90deg, " + this.settings.stateColorFailedCustom + " " + download.progress + "%, transparent " + download.progress + "%)";
            }
            else if (download.state == "paused")
            {
                downloadButton.style.background = "linear-gradient(90deg, " + this.settings.stateColorPausedCustom + " " + download.progress + "%, transparent " + download.progress + "%)";
            }
            else if (download.state == "succeeded" && !download.opened)
            {
                downloadButton.style.background = this.settings.stateColorSucceededCustom;
            }
            else if (download.state == "succeeded" && download.opened)
            {
                downloadButton.style.background = this.settings.stateColorOpenedCustom;
            }
            else
            {
                downloadButton.style.background = "linear-gradient(90deg, " + this.settings.stateColorProgressCustom + " " + download.progress + "%, transparent " + download.progress + "%)";
            }
        
            let downloadState = (download.state != "downloading") ? _("state-" + download.state) : formatTime(getTimeLeft(download.currentBytes, download.totalBytes, download.speed));
            textNode.setAttribute("value", download.progress + "% (" + formatSize(download.currentBytes, download.totalBytes) + ") - " + downloadState);
        }
        else
        {
            if (download.state == "error" || download.state == "canceled")
            {
                downloadButton.style.background = this.settings.stateColorFailedCustom;
            }
            else if (download.state == "succeeded" && !download.opened)
            {
                downloadButton.style.background = this.settings.stateColorSucceededCustom;
            }
            else if (download.state == "succeeded" && download.opened)
            {
                downloadButton.style.background = this.settings.stateColorOpenedCustom;
            }
            else
            {
                downloadButton.style.background = "";
            }
            
            let downloadState = (download.state != "downloading") ? _("state-" + download.state) : formatNumber(formatSize(download.speed)) + "/s";
            textNode.setAttribute("value", formatSize(download.currentBytes, null) + " - " + downloadState);
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
        
        if (this.settings.useAnimations && !downloadBar.hidden)
        {
            downloadButton.addEventListener("transitionend", function()
            {
                downloadContainer.removeChild(downloadButton);
                self.updateUiInternal(window);
            }, false);
            downloadButton.body.style.width = "0";
        }
        else
        {
            downloadContainer.removeChild(downloadButton);
            self.updateUiInternal(window);
        }
    },
    
    addDownload: function(download)
    {
        if (this.downloads[download.id]) return;
    
        if (this.settings.hideAutoOpeningDownloads && 
            download.isAutoOpen)
        {
            return;
        }
        
        this.downloads[download.id] = download;
        this.downloadIds.push(download.id);
        
        while (this.downloadIds.length > MAX_DOWNLOAD_BUTTONS)
        {
            this.removeDownloadButton(this.downloads[this.downloadIds[0]]);
        }
    },
    
    removeDownload: function(download)
    {
        if (!this.downloads[download.id]) return;
    
        this.removeDownloadInernal(download.id);
    },
    
    removeDownloadInernal: function(downloadId)
    {       
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
        closeButton.hidden = true;
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
        
        this.createDownloadButton(window, { id: DOWNLOAD_BUTTON_DUMMY_NAME });
        this.updateUiInternal(window);
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
    
        if (this.downloadIds.length > 0)
        {
            downloadBar.hidden = false;
        }
        
        let downloadUrlOrPath = (this.settings.downloadButtonText == "url") ? download.url : download.path;
        
        let downloadButton = document.createElement("hbox");
        downloadButton.style.visibility = (download.id == DOWNLOAD_BUTTON_DUMMY_NAME) ? "hidden" : "visible";
        downloadButton.setAttribute("id", download.id);
        downloadButton.classList.add(CLASS_DOWNLOAD_BUTTON);
        downloadButton.setAttribute("tooltiptext", downloadUrlOrPath);
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
        downloadButtonText1.setAttribute("value", downloadUrlOrPath);
        downloadButton.body.appendChild(downloadButtonText1);
        downloadButton.Text = downloadButtonText1;
        
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
   
    closeDownloadBar: function()
    {
        for (let window of windows("navigator:browser", { includePrivate:true }))
        {
            this.closeDownloadBarInternal(window);
        }
        
        if (this.settings.clearOnClose)
        {
            for (let id in this.downloads)
            {
                let download = this.downloads[id];
                download.remove();
            }
        }
    },
    
    closeDownloadBarInternal: function(window)
    {   
        const self = this;
        
        if (!isBrowserWindow(window)) return;
    
        let document = window.document;
    
        let downloadBar = document.getElementById(ID_DOWNLOAD_BAR);
        if (!downloadBar) return;
        
        if (!this.settings.useAnimations || downloadBar.hidden || !this.settings.clearOnClose || this.downloadIds.length == 0)
        {
            downloadBar.hidden = true;
        }
        else
        {
            let downloadButton = document.getElementById(this.downloadIds[0]);           
            downloadButton.addEventListener("transitionend", function()
            {
                downloadBar.hidden = true;
            }, false);
        }
    },
};

exports.DownloadBar = DownloadBar;