'use client'

import { useEffect } from 'react'

// Color theme configurations for shadcn (matching 10xgaming)
const colorThemes = {
  neutral: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '0 0% 3.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '0 0% 3.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '0 0% 3.9%',
      '--primary': '0 0% 9%',
      '--primary-foreground': '0 0% 98%',
      '--secondary': '0 0% 96.1%',
      '--secondary-foreground': '0 0% 9%',
      '--muted': '0 0% 96.1%',
      '--muted-foreground': '0 0% 45.1%',
      '--accent': '0 0% 96.1%',
      '--accent-foreground': '0 0% 9%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '0 0% 89.8%',
      '--input': '0 0% 89.8%',
      '--ring': '0 0% 9%',
    },
    dark: {
      '--background': '0 0% 3.9%',
      '--foreground': '0 0% 98%',
      '--card': '0 0% 3.9%',
      '--card-foreground': '0 0% 98%',
      '--popover': '0 0% 3.9%',
      '--popover-foreground': '0 0% 98%',
      '--primary': '0 0% 98%',
      '--primary-foreground': '0 0% 9%',
      '--secondary': '0 0% 14.9%',
      '--secondary-foreground': '0 0% 98%',
      '--muted': '0 0% 14.9%',
      '--muted-foreground': '0 0% 63.9%',
      '--accent': '0 0% 14.9%',
      '--accent-foreground': '0 0% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '0 0% 98%',
      '--border': '0 0% 14.9%',
      '--input': '0 0% 14.9%',
      '--ring': '0 0% 83.1%',
    },
  },
  slate: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '215.4 16.3% 46.9%',
      '--card': '0 0% 100%',
      '--card-foreground': '215.4 16.3% 46.9%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '215.4 16.3% 46.9%',
      '--primary': '215.4 16.3% 46.9%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 40% 96%',
      '--secondary-foreground': '215.4 16.3% 46.9%',
      '--muted': '210 40% 96%',
      '--muted-foreground': '215.3 16.3% 46.9%',
      '--accent': '210 40% 96%',
      '--accent-foreground': '215.4 16.3% 46.9%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214.3 31.8% 91.4%',
      '--input': '214.3 31.8% 91.4%',
      '--ring': '215.4 16.3% 46.9%',
    },
    dark: {
      '--background': '215.4 16.3% 46.9%',
      '--foreground': '210 40% 98%',
      '--card': '215.4 16.3% 46.9%',
      '--card-foreground': '210 40% 98%',
      '--popover': '215.4 16.3% 46.9%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '210 40% 98%',
      '--primary-foreground': '215.4 16.3% 46.9%',
      '--secondary': '215.3 19.3% 34.5%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '215.3 19.3% 34.5%',
      '--muted-foreground': '217.9 10.6% 64.9%',
      '--accent': '215.3 19.3% 34.5%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '215.3 19.3% 34.5%',
      '--input': '215.3 19.3% 34.5%',
      '--ring': '216 12.2% 83.9%',
    },
  },
  violet: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '263.4 70% 50.4%',
      '--card': '0 0% 100%',
      '--card-foreground': '263.4 70% 50.4%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '263.4 70% 50.4%',
      '--primary': '263.4 70% 50.4%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 40% 96%',
      '--secondary-foreground': '263.4 70% 50.4%',
      '--muted': '210 40% 96%',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--accent': '210 40% 96%',
      '--accent-foreground': '263.4 70% 50.4%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214.3 31.8% 91.4%',
      '--input': '214.3 31.8% 91.4%',
      '--ring': '263.4 70% 50.4%',
    },
    dark: {
      '--background': '263.4 70% 50.4%',
      '--foreground': '210 40% 98%',
      '--card': '263.4 70% 50.4%',
      '--card-foreground': '210 40% 98%',
      '--popover': '263.4 70% 50.4%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '210 40% 98%',
      '--primary-foreground': '263.4 70% 50.4%',
      '--secondary': '215.3 19.3% 34.5%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '215.3 19.3% 34.5%',
      '--muted-foreground': '217.9 10.6% 64.9%',
      '--accent': '215.3 19.3% 34.5%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '215.3 19.3% 34.5%',
      '--input': '215.3 19.3% 34.5%',
      '--ring': '216 12.2% 83.9%',
    },
  },
  blue: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '221.2 83.2% 53.3%',
      '--card': '0 0% 100%',
      '--card-foreground': '221.2 83.2% 53.3%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '221.2 83.2% 53.3%',
      '--primary': '221.2 83.2% 53.3%',
      '--primary-foreground': '210 40% 98%',
      '--secondary': '210 40% 96%',
      '--secondary-foreground': '221.2 83.2% 53.3%',
      '--muted': '210 40% 96%',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--accent': '210 40% 96%',
      '--accent-foreground': '221.2 83.2% 53.3%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214.3 31.8% 91.4%',
      '--input': '214.3 31.8% 91.4%',
      '--ring': '221.2 83.2% 53.3%',
    },
    dark: {
      '--background': '221.2 83.2% 53.3%',
      '--foreground': '210 40% 98%',
      '--card': '221.2 83.2% 53.3%',
      '--card-foreground': '210 40% 98%',
      '--popover': '221.2 83.2% 53.3%',
      '--popover-foreground': '210 40% 98%',
      '--primary': '210 40% 98%',
      '--primary-foreground': '221.2 83.2% 53.3%',
      '--secondary': '215.3 19.3% 34.5%',
      '--secondary-foreground': '210 40% 98%',
      '--muted': '215.3 19.3% 34.5%',
      '--muted-foreground': '217.9 10.6% 64.9%',
      '--accent': '215.3 19.3% 34.5%',
      '--accent-foreground': '210 40% 98%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '215.3 19.3% 34.5%',
      '--input': '215.3 19.3% 34.5%',
      '--ring': '216 12.2% 83.9%',
    },
  },
  green: {
    light: {
      '--background': '0 0% 100%',
      '--foreground': '142.1 76.2% 36.3%',
      '--card': '0 0% 100%',
      '--card-foreground': '142.1 76.2% 36.3%',
      '--popover': '0 0% 100%',
      '--popover-foreground': '142.1 76.2% 36.3%',
      '--primary': '142.1 76.2% 36.3%',
      '--primary-foreground': '355.7 100% 97.3%',
      '--secondary': '210 40% 96%',
      '--secondary-foreground': '142.1 76.2% 36.3%',
      '--muted': '210 40% 96%',
      '--muted-foreground': '215.4 16.3% 46.9%',
      '--accent': '210 40% 96%',
      '--accent-foreground': '142.1 76.2% 36.3%',
      '--destructive': '0 84.2% 60.2%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '214.3 31.8% 91.4%',
      '--input': '214.3 31.8% 91.4%',
      '--ring': '142.1 76.2% 36.3%',
    },
    dark: {
      '--background': '142.1 76.2% 36.3%',
      '--foreground': '355.7 100% 97.3%',
      '--card': '142.1 76.2% 36.3%',
      '--card-foreground': '355.7 100% 97.3%',
      '--popover': '142.1 76.2% 36.3%',
      '--popover-foreground': '355.7 100% 97.3%',
      '--primary': '355.7 100% 97.3%',
      '--primary-foreground': '142.1 76.2% 36.3%',
      '--secondary': '215.3 19.3% 34.5%',
      '--secondary-foreground': '355.7 100% 97.3%',
      '--muted': '215.3 19.3% 34.5%',
      '--muted-foreground': '217.9 10.6% 64.9%',
      '--accent': '215.3 19.3% 34.5%',
      '--accent-foreground': '355.7 100% 97.3%',
      '--destructive': '0 62.8% 30.6%',
      '--destructive-foreground': '210 40% 98%',
      '--border': '215.3 19.3% 34.5%',
      '--input': '215.3 19.3% 34.5%',
      '--ring': '216 12.2% 83.9%',
    },
  },
  // Add more themes as needed - keeping it concise for now
}

export function useColorTheme(colorTheme: string = 'neutral'): void {
  useEffect(() => {
    // Only apply custom color themes if it's not the default neutral theme
    // This prevents interference with the default light/dark mode CSS variables
    if (colorTheme === 'neutral') {
      return
    }

    const applyTheme = (): void => {
      const root = document.documentElement
      const isDark = document.documentElement.classList.contains('dark')

      const theme =
        colorThemes[colorTheme as keyof typeof colorThemes] ||
        colorThemes.neutral
      const colors = isDark ? theme.dark : theme.light

      // Apply all theme properties to make themes fully visible
      const themeProperties = [
        '--background',
        '--foreground',
        '--card',
        '--card-foreground',
        '--popover',
        '--popover-foreground',
        '--primary',
        '--primary-foreground',
        '--secondary',
        '--secondary-foreground',
        '--muted',
        '--muted-foreground',
        '--accent',
        '--accent-foreground',
        '--destructive',
        '--destructive-foreground',
        '--border',
        '--input',
        '--ring',
      ] as const

      // Apply all theme properties
      themeProperties.forEach((property) => {
        const value = colors[property as keyof typeof colors]
        if (value) {
          root.style.setProperty(property, value)
        }
      })

      // Notify listeners that color theme CSS variables changed
      setTimeout(() => {
        document.dispatchEvent(new Event('color-theme-change'))
      }, 0)
    }

    // Apply theme immediately
    applyTheme()

    // Add a listener for theme changes from the navigation component
    const handleThemeChange = (): void => {
      setTimeout(applyTheme, 100)
    }

    document.addEventListener('theme-change', handleThemeChange)
    document.addEventListener('color-theme-change', handleThemeChange)

    return (): void => {
      document.removeEventListener('theme-change', handleThemeChange)
      document.removeEventListener('color-theme-change', handleThemeChange)
    }
  }, [colorTheme])
}
