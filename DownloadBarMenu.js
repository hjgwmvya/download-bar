const { name: addonName } = require("sdk/self");
const tabs = require("sdk/tabs");
const _ = require("sdk/l10n").get;

const { Menu } = require("./Menu.js");

DownloadBarMenu = function(document)
{
    this.init(addonName + "-download-bar-menu", document);
}

DownloadBarMenu.prototype = new Menu();
DownloadBarMenu.prototype.constructor = DownloadBarMenu;
DownloadBarMenu.prototype.showMenu = function(downloads, x, y, isContextMenu)
{
    this.menuTarget = downloads;
    this.isContextMenu = isContextMenu;

    this.setMenu();
   
    this.setMenuItem("show-all-downloads", _("show-all-downloads"), _("show-all-downloads-accesskey"), false, false,
        function()
        {
            tabs.open("about:downloads");
        });
        
    this.setMenuSeparator("separator-1", false);
    
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

    this.menu.openPopupAtScreen(x, y, false);
};
exports.DownloadBarMenu = DownloadBarMenu;