exports.dashify = dashify;
function dashify(value)
{
    value = value.replace(/([a-z])([A-Z])/g, '$1-$2');
    value = value.replace(/[ \t\W]/g, '-');
    value = value.replace(/^\W+/, '');
    return value.toLowerCase();
}
        
exports.isBrowserWindow = isBrowserWindow;
function isBrowserWindow(window)
{
    if (!window.document || !window.document.documentElement) return false;
        
    return (window.document.documentElement.getAttribute('windowtype') == "navigator:browser");
}

exports.formatNumber = formatNumber;
function formatNumber(number)
{
    let rx = /(\d+)(\d{3})/;
    
    return String(number).replace(/^\d+/, function(w)
    {
        while (rx.test(w))
        {
            w = w.replace(rx, '$1.$2');
        }
        
        return w;
    });
}

exports.formatSize = formatSize;
function formatSize(currentBytes, totalBytes)
{
    let units = [ "B", "KB", "MB", "GB", "TB" ];

    let formatedSize = "";
    if (totalBytes)
    {
        formatedSize = formatNumber(currentBytes) + "/" + formatNumber(totalBytes) + " " + units[0];
    }
    else
    {
        formatedSize = formatNumber(currentBytes) + " " + units[0];
    }

    let unitIndex = 1;                
    while (currentBytes >= 10000 || (totalBytes && totalBytes >= 10000))
    {
        if (totalBytes)
        {
            currentBytes = Math.floor(currentBytes / 1024);
            totalBytes = Math.floor(totalBytes / 1024);
            formatedSize = formatNumber(currentBytes) + "/" + formatNumber(totalBytes) + " " + units[unitIndex];
        }
        else
        {
            currentBytes = Math.floor(currentBytes / 1024);
            formatedSize = formatNumber(currentBytes) + " " + units[unitIndex];
        }
        
        unitIndex++;
    }
    
    return formatedSize;
}

exports.getTimeLeft = getTimeLeft;
function getTimeLeft(currentBytes, totalBytes, speed)
{
    if (!speed) return -1;

    let bytesLeft = (totalBytes - currentBytes);
    
    let timeLeft = bytesLeft / speed;
    return timeLeft;
}

exports.formatTime = formatTime;
function formatTime(totalSeconds)
{
    if (totalSeconds <= 0) return "00:00:00";
    if (totalSeconds > 100 * 60 * 60) return "Unknown";

    let hours = Math.floor(totalSeconds / 60 / 60);
    let minutes = Math.floor(totalSeconds / 60 - Math.floor(totalSeconds / 60 / 60) * 60);
    let seconds = Math.floor(totalSeconds - Math.floor(totalSeconds / 60) * 60);
    
    let sHours = (hours >= 10) ? hours : "0" + hours;
    let sMinutes = (minutes >= 10) ? minutes : "0" + minutes;
    let sSeconds = (seconds >= 10) ? seconds : "0" + seconds;
    
    return sHours + ":" + sMinutes + ":" + sSeconds;
}