const { Cc, Ci } = require("chrome");

const handlerService = Cc["@mozilla.org/uriloader/handler-service;1"].getService(Ci.nsIHandlerService);
const mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);

function DownloadHelper()
{
}
    
DownloadHelper.prototype = {
    isAutoOpenEnabled: function(download)
    {
        if (download.contentType == null)
            return false;

        let handlerInfo = mimeService.getFromTypeAndExtension(download.contentType, null);
        if (handlerInfo == null)
            return false;

        if (handlerInfo.alwaysAskBeforeHandling)
            return false;
            
        if (handlerInfo.preferredAction != Ci.nsIHandlerInfo.useHelperApp &&
            handlerInfo.preferredAction != Ci.nsIHandlerInfo.handleInternally &&
            handlerInfo.preferredAction != Ci.nsIHandlerInfo.useSystemDefault)
        {
            return false;
        }
        
        return true;
    }
};

exports.DownloadHelper = new DownloadHelper();