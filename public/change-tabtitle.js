// UTF-8文字列をBase64にエンコードする関数
const encodeBase64UTF8 = (input) => {
    let encoder = new TextEncoder();
    let data = encoder.encode(input);
    let base64String = btoa(String.fromCharCode.apply(null, data));
    return base64String;
}

// Base64エンコードされた文字列をUTF-8にデコードする関数
const decodeBase64UTF8 = (encoded) => {
    let binaryString = atob(encoded);
    let binaryLen = binaryString.length;
    let bytes = new Uint8Array(binaryLen);
    for (let i = 0; i < binaryLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    let decoder = new TextDecoder();
    return decoder.decode(bytes);
}

const changeTitle = () => {
    // タイトル変更の監視
    // タイトルを監視するためのMutationObserverを作成する
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                console.log("Title:", document.title)
                try{
                    window.chrome.webview.postMessage(`{"type": "tab-title", "data": "${encodeBase64UTF8(document.title)}"}`)
                }catch(error){
                    console.error(error.message)
                }
            }
        })
    })
    // 監視するターゲットを設定（ここではdocument.headのtitle要素）
    const targetNode = document.querySelector('title')
    // オプションを設定（子ノードの変化を監視）
    const config = { childList: true }
    // 監視を開始
    observer.observe(targetNode, config)
}
changeTitle()