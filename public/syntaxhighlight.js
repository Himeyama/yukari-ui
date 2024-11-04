const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}


class SyntaxHighlight{
    static temp = ""
    static codeData = {}

    static observ = (code) => {
        // 監視する変更の種類を設定
        const config = { attributes: false, characterData: true, subtree: true, childList: true };

        // コールバック関数を定義
        const callback = (mutationsList, observer) => {
            for(let mutation of mutationsList) {
                const uuid = code.getAttribute("uuid")
                const content = code.textContent
                if(SyntaxHighlight.codeData["uuid"] != content){
                    // console.log('変更されました:', code, uuid)
                    SyntaxHighlight.codeData["uuid"] = content
                    if(code && code.getAttribute("data-highlighted")){
                        code.removeAttribute("data-highlighted")
                    }
                    code.textContent = content
                    hljs.highlightElement(code)
                }
            }
        }

        // `MutationObserver` インスタンスを作成
        const observer = new MutationObserver(callback)

        // 監視を開始
        observer.observe(code, config)
    }

    static highlight = () => {
        const preview = document.getElementById("preview")
        const codes = preview?.querySelectorAll("pre code")
    
        // let temp = ""
        if(codes){
            for(const code of codes) {
                if(code.getAttribute("uuid") == null) {
                    code.setAttribute("uuid", generateUUID())
                    hljs.highlightElement(code)
                    SyntaxHighlight.observ(code)
                }
            }
        }
    }

    static auto = () => {
        setInterval(SyntaxHighlight.highlight, 500);
    }
}

SyntaxHighlight.auto()
