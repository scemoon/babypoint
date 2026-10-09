// components/icon/icon.js
Component({
  properties: {
    name: {
      type: String,
      value: 'star'
    },
    size: {
      type: Number,
      value: 48
    },
    color: {
      type: String,
      value: '#FF8B45'
    }
  },

  data: {
    iconData: {}
  },

  lifetimes: {
    attached() {
      this.updateIcon()
    }
  },

  observers: {
    'name': function() {
      this.updateIcon()
    }
  },

  methods: {
    updateIcon() {
      const icons = {
        star: { path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', fill: 'none' },
        gift: { path: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z', fill: 'none' },
        calendar: { path: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18', fill: 'none' },
        trophy: { path: 'M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9zM6 9h12M6 9a6 6 0 0 0 6 6V4H6v5zM18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9zM18 9a6 6 0 0 1-6 6V4h6v5zM12 17v4M8 21h8', fill: 'none' },
        list: { path: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', fill: 'none' },
        user: { path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', fill: 'none' },
        arrowDown: { path: 'M12 5v14M19 12l-7 7-7-7', fill: 'none' },
        arrowRight: { path: 'M5 12h14M12 5l7 7-7 7', fill: 'none' },
        check: { path: 'M20 6L9 17l-5-5', fill: 'none' },
        plus: { path: 'M12 5v14M5 12h14', fill: 'none' },
        close: { path: 'M18 6L6 18M6 6l12 12', fill: 'none' },
        coin: { path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', fill: 'none' },
        crown: { path: 'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z', fill: 'none' },
        medal: { path: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', fill: 'none' },
        history: { path: 'M12 8v4l3 3M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', fill: 'none' },
        success: { path: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3', fill: 'none' },
        info: { path: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01', fill: 'none' },
        ranking: { path: 'M8 21h8M12 17v4M7 4h10l-2 7h-6zM5 4l1 7h6l-2-7zM17 4l2 7M15 4l-2 7', fill: 'none' },
        exchange: { path: 'M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4', fill: 'none' },
        home: { path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 0-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1m6 0h-6', fill: 'none' }
      }
      
      const icon = icons[this.properties.name] || icons.star
      this.setData({
        iconData: {
          path: icon.path,
          fill: icon.fill
        }
      })
    }
  }
})
