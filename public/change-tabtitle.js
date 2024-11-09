const changeTitle = () => {
    // タイトル変更の監視
    // タイトルを監視するためのMutationObserverを作成する
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                console.log("Title:", document.title)
                window.chrome.webview.postMessage(document.title)
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