function Menu()
{
}

Menu.prototype = {
    init: function(menuId, document)
    {
        this.menuId = menuId;
        this.document = document;
        this.menu = null;
        this.isContextMenu = false;
        this.menuTarget = null;
        this.popupShowingEventListener = [ ];
        this.popupHidingEventListener = [ ];
    },

    addPopupShowingEventListener: function(listener)
    {
        this.popupShowingEventListener.push(listener);
    },

    addPopupHidingEventListener: function(listener)
    {
        this.popupHidingEventListener.push(listener);
    },
    
    setMenu: function()
    {        
        const self = this;
    
        this.menu = this.document.getElementById(this.menuId);
        if (!this.menu)
        {
            this.menu = this.document.createElement("menupopup");
            this.menu.setAttribute("id", this.menuId);
            this.document.documentElement.appendChild(this.menu);
        }

        let onPopupShowing = function()
        {
            if (self.isContextMenu) return;
            
            for (let listener of self.popupShowingEventListener)
            {
                listener({ download: self.menuTarget, isContextMenu: self.isContextMenu });
            }
        };
        
        if (this.menu.onPopupShowingEvent)
        {
            this.menu.removeEventListener("popupshowing", this.menu.onPopupShowingEvent);
            this.menu.onPopupShowingEvent = null;
        }
        this.menu.onPopupShowingEvent = onPopupShowing;
        this.menu.addEventListener("popupshowing", onPopupShowing);
        
        let onPopupHiding = function()
        {
            for (let listener of self.popupHidingEventListener)
            {
                listener({ download: self.menuTarget, isContextMenu: self.isContextMenu });
            }
        };
        
        if (this.menu.onPopupHidingEvent)
        {
            this.menu.removeEventListener("popuphiding", this.menu.onPopupHidingEvent);
            this.menu.onPopupHidingEvent = null;
        }
        this.menu.onPopupHidingEvent = onPopupHiding;
        this.menu.addEventListener("popuphiding", onPopupHiding);
    },

    setMenuItem: function(id, label, accesskey, disabled, hidden, callback)
    {
        let menuItemId = this.menuId + "-" + id;
    
        let menuItem = this.document.getElementById(menuItemId);
        if (!menuItem)
        {
            menuItem = this.document.createElement("menuitem");
            menuItem.setAttribute("id", menuItemId);
            this.menu.appendChild(menuItem);
        }
        
        menuItem.setAttribute("label", label);
        menuItem.setAttribute("accesskey", accesskey);
        menuItem.setAttribute("disabled", disabled);
        menuItem.setAttribute("hidden", hidden);
        
        if (menuItem.onClickEvent)
        {
            menuItem.removeEventListener("click", menuItem.onClickEvent);
            menuItem.onClickEvent = null;
        }
        menuItem.onClickEvent = callback;
        menuItem.addEventListener("click", callback);
    },
    
    setMenuSeparator: function(id, hidden)
    {
        let menuItemId = this.menuId + "-" + id;
    
        let menuItem = this.document.getElementById(menuItemId);
        if (!menuItem)
        {
            menuItem = this.document.createElement("menuseparator");
            menuItem.setAttribute("id", menuItemId);
            this.menu.appendChild(menuItem);
        }
        
        menuItem.hidden = hidden;
    },
};
exports.Menu = Menu;