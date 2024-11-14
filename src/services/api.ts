import OpenAI from "openai";

const fetchVersion = async () => {
    let port = 50027
    while (port <= 50050) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}/api/version`);
            // レスポンスが正常かどうかをチェック
            const data = await response.text();
            if (data.startsWith("yukari-engine")) {
                return port;
            }
        } catch (error) {
            console.error('Error fetching version:', error);
            port += 1
        }
    }
    return null;
}

const getAPIKeyFromServer = async (port: number) => {
    try {
        const response = await fetch(`http://127.0.0.1:${port}/api/apikey`);
        // レスポンスが正常かどうかをチェック
        if (response.status === 200) {
            const data = await response.text();
            // レスポンスデータを返す
            return data;
        } else {
            // 200以外のステータスの場合は空文字列を返す
            return "";
        }
    } catch (error) {
        console.error('Error fetching version:', error);
    }
    return null
}

export const fetchAPIKey = async () => {
    const version = await fetchVersion();
    if (!version) return;
    const port = version;
    return getAPIKeyFromServer(port);
};

export const createOpenAI = async () => {
    const apiKey = await fetchAPIKey();
    if (!apiKey) {
        alert("API キーが設定されていません");
        return null;
    }
    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });
    return openai;
};
