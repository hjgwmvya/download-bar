const { name: addonName } = require("sdk/self");
const tabs = require("sdk/tabs");
const _ = require("sdk/l10n").get;

const { Menu } = require("./Menu.js");

DownloadMenu = function(document)
{
    this.init(addonName + "-download-menu", document);
}

DownloadMenu.prototype = new Menu();
DownloadMenu.prototype.constructor = DownloadMenu;
DownloadMenu.prototype.showMenu = function({ download, downloads }, x, y, isContextMenu)
{
    this.menuTarget = download;
    this.isContextMenu = isContextMenu;

    this.setMenu();
   
    this.setMenuItem("resume", _("resume"), _("resume-accesskey"), false, (download.state != "paused"),
        function()
        {
            download.resume();
        });
    this.setMenuItem("stop", _("pause"), _("pause-accesskey"), false, (download.state != "downloading"),
        function()
        {
            download.pause();
        });
    this.setMenuItem("retry", _("restart"), _("restart-accesskey"), false, (download.state != "canceled" && download.state != "error"),
        function()
        {
            download.retry();
        });
    this.setMenuItem("cancel", _("cancel"), _("cancel-accesskey"), false, (download.state != "paused" && download.state != "downloading"),
        function()
        {
            download.cancel();
        });
        
    this.setMenuSeparator("separator-1", (download.state == "succeeded"));
    
    this.setMenuItem("open", _("open"), _("open-accesskey"), (download.state != "succeeded"), false,
        function()
        {
            download.open(this.document.defaultView);
        });
    this.setMenuItem("open-folder", _("open-folder"), _("open-folder-accesskey"), (download.state == "error"), false,
        function()
        {
            download.openFolder();
        });
    this.setMenuItem("copy-location", _("copy-location"), _("copy-location-accesskey"), (download.state == "error"), false,
        function()
        {
            download.copyLocation();
        });
        
    this.setMenuSeparator("separator-2", false);
        
    this.setMenuItem("remove", _("remove"), _("remove-accesskey"), false, false,
        function()
        {
            download.remove();
        });
        
    this.setMenuItem("clean-up-list", _("clean-up-list"), _("clean-up-list-accesskey"), false, false,
        function()
        {
            for (let index in downloads)
            {
                let download = downloads[index];
                if (download.state == "succeeded" || download.state == "canceled" || download.state == "failed" || download.state == "error")
                {
                    download.remove();
                }
            }
        });

    this.setMenuSeparator("separator-3", false);
        
    this.setMenuItem("show-all-downloads", _("show-all-downloads"), _("show-all-downloads-accesskey"), false, false,
        function()
        {
            tabs.open("about:downloads");
        });
   
    this.menu.openPopupAtScreen(x, y, false);
};
exports.DownloadMenu = DownloadMenu;