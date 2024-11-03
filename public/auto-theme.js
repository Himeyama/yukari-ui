const getTheme = () => {
    const isDarkTheme = window.matchMedia('(prefers-color-scheme: dark)')
    return isDarkTheme.matches ? "dark" : "light"
}

const theme = getTheme()
const autoTheme = () => {
    if(getTheme() != theme){
        location.reload()
    }
}

setInterval(autoTheme, 500)