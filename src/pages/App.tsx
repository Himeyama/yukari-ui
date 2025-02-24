import { useState, useRef, useEffect } from 'react';
import '../styles/App.css';
import { FluentProvider, teamsLightTheme, teamsDarkTheme, Button, ProgressBar, Select } from '@fluentui/react-components';
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { SendFilled } from "@fluentui/react-icons";
import { Conversation, HistoryItem } from '../services/types';
import "../i18n/i18n";
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const getSystemTheme = (): string => {
  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  return darkThemeMq.matches ? "dark" : "light";
}

const generateUUID = (): string => {
  return uuidv4();
}

const getLanguageModel = async() : Promise<string> => {
  let languageModel: string = "";
  try{
    (window as any).chrome.webview.postMessage(`{"type": "get", "data": "languageModel"}`)
    const waitForLanguageModel = async() : Promise<string> => {
      return await new Promise((resolve) => {
        const interval = setInterval(() => {
          if ((window as any).languageModel != ""){
            clearInterval(interval);
            resolve((window as any).languageModel)
          }
        }, 10);
      })
    }
    languageModel = await waitForLanguageModel();
    (window as any).languageModel = "";
    if(languageModel == "unset"){
      languageModel = ""
      return ""
    }
  }catch(error){
    console.error(error instanceof Error)
    return ""
  }
  return languageModel;
}

const getAPIKey = async() => {
  let apiKey: string = "";  
  try{
    const model = await getLanguageModel();
    if (/^grok/.test(model))
      (window as any).chrome.webview.postMessage(`{"type": "get", "data": "grokApiKey"}`)
    else
      (window as any).chrome.webview.postMessage(`{"type": "get", "data": "openAIApiKey"}`)
    const waitForApiKey = async() : Promise<string> => {
      return await new Promise((resolve) => {
        const interval = setInterval(() => {
          if ((window as any).apiKey != ""){
            clearInterval(interval);
            resolve((window as any).apiKey)
          }
        }, 10);
      })
    }
    apiKey = await waitForApiKey();
    if(apiKey == "unset")
      apiKey = ""
  }catch(error){
    console.error(error instanceof Error)
    return null
  }

  if(!apiKey || apiKey == ""){
    return null
  }
  return apiKey
}

const createOpenAI = async () => {
  const apiKey = await getAPIKey()
  if (!apiKey){
    alert("API キーが設定されていません")
    return null
  }
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  })
  return openai
}

const getStreamingResponse = async (
  openai: OpenAI | null,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  setAssistant: React.Dispatch<React.SetStateAction<string>>,
): Promise<string | null> => {
  if (openai == null)
    return null
  
  const model = await getLanguageModel();
  
  console.log("model:", model);
  if (/^grok/.test(model))
    openai.baseURL = "https://api.x.ai/v1"

  const stream = await openai.chat.completions.create({
    model: model,
    messages: messages,
    stream: true
  })

  let responseText = ""
  for await (const chunk of stream) {
    const output: string = chunk.choices[0]?.delta?.content || ""
    // console.log(output)
    responseText += output
    setAssistant(responseText)
  }
  return responseText
}

// UTF-8文字列をBase64にエンコードする関数
const encodeBase64UTF8 = (input: string) => {
  let encoder = new TextEncoder();
  let data = encoder.encode(input);
  let base64String = btoa(String.fromCharCode.apply(null, (data as any)));
  return base64String;
}

// Base64エンコードされた文字列をUTF-8文字列にデコードする関数
const decodeBase64UTF8 = (input: string): string => {
  // Base64の文字列をデコード
  const binaryString = atob(input);
  // バイナリ文字列をUint8Arrayに変換
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  // Uint8ArrayをUTF-8文字列に変換
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(bytes);
}

const send = async (
  markdown: string,
  setAssistant: React.Dispatch<React.SetStateAction<string>>,
  historyItems: HistoryItem[],
  setItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>,
  progressRef: React.MutableRefObject<null>,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  setMessages: React.Dispatch<React.SetStateAction<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>>,
  conversations: Conversation[],
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>,
  selectedModel: string
) => {
  console.log("送信:", markdown)
  const openai = await createOpenAI()
  if (openai == null) return;
  const userMessage: ChatCompletionMessageParam = {
    role: "user",
    content: markdown
  }
  const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [...messages, userMessage]
  // プログレスバーの表示
  if (progressRef.current) {
    const current: HTMLElement = progressRef.current
    current.classList.remove("hidden")
  }
  // 送信
  const assistant = await getStreamingResponse(openai, requestMessages, setAssistant)
  // プログレスバーの非表示
  if (progressRef.current) {
    const current: HTMLElement = progressRef.current
    current.classList.add("hidden")
  }
  if (assistant) {
    // Message リストに追加
    const assistantMessage: ChatCompletionMessageParam = {
      role: "assistant",
      content: assistant
    }
    setMessages([...requestMessages, assistantMessage])

    const uuid: string = generateUUID()
    const conversation: Conversation = {
      uuid: uuid,
      user: markdown,
      assistant: assistant
    }
    setConversations([...conversations, conversation])

    // Markdown を表示
    setAssistant(assistant);

    // アシスタントを記録
    (window as any).setAssistant(assistant)

    const user1line = markdown.split("\n")[0]
    document.title = user1line
    const historyItem: HistoryItem = {
      user: markdown,
      assistant: assistant,
      uuid: uuid
    }

    const historyData: string = encodeBase64UTF8(JSON.stringify(historyItem));
    (window as any).chrome.webview.postMessage(`{"type": "history", "data": "${historyData}"}`)

    // 履歴アイテムに追加
    setItems([historyItem, ...historyItems])
  }
}

const App = () => {
  const [theme, setTheme] = useState(teamsLightTheme);

  const handleThemeChange = (event: any) => {
    setTheme(event.matches ? teamsDarkTheme : teamsLightTheme);
  };

  useEffect(() => {
    console.log("init.")
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // 初期テーマの設定
    setTheme(mediaQuery.matches ? teamsDarkTheme : teamsLightTheme);

    // 監視の登録
    mediaQuery.addEventListener('change', handleThemeChange);

    const handleKeyDown = (event: { key: string; preventDefault: () => void; }) => {
      // F5 (キーコード 116) が押されたとき
      if (event.key === 'F5') {
        event.preventDefault()  // デフォルトの動作をキャンセル
      } else if ((event as any).shiftKey && event.key === 'Enter') {
        console.log("Shift + Enter")
        const sendButton = document.getElementById("send-button")
        sendButton?.click()
        event.preventDefault()
      }
    }

    setInterval(() => {
      if((window as any).markdown != null){
        setAssistant((window as any).markdown);
        // アシスタントを記録
        try{
          (window as any).setAssistant((window as any).markdown)
        }catch(error){
        }
        (window as any).markdown = null
      }
    }, 50);

    window.addEventListener('keydown', handleKeyDown)

    // クリーンアップ関数
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange)
      window.removeEventListener('keydown', handleKeyDown)
    };
  }, [])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([])
  const { t } = useTranslation()
  // const theme = getSystemTheme() === "light" ? webLightTheme : webDarkTheme // ここはシステムテーマを適宜取得するように変更することもできる
  const vsTheme = getSystemTheme() === "light" ? "vs-light" : "vs-dark"
  const [markdown, setMarkdown] = useState("")
  const [assistant, setAssistant] = useState("")
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o-mini')

  const handleEditorChange = (newValue: string | undefined) => {
    setMarkdown(newValue || "")
  }

  const historyWidth: number = 244

  const progressRef = useRef(null);

  const [historyClose, setHistoryClose] = useState("")
  const closeHistory = () => {
    setHistoryClose("history-close")
  }

  return (
    <FluentProvider theme={theme}>
      <div className={"App " + historyClose}>
        <ProgressBar ref={progressRef} style={{ height: '4px' }} className="hidden" id="progress-bar" />
        <main>
          <div id="editor">
            {/* <Select onChange={(e) => setSelectedModel(e.target.value)}>
              <option value="gpt-4o-mini">GPT-4o mini</option>
              <option value="o1-mini">o1-mini</option>
            </Select> */}
            <div style={{ borderRadius: '4px', overflow: 'hidden' }} id="monaco-editor">
              <Editor theme={vsTheme} options={{ wordWrap: 'on' }} height="calc(100vh - 80px)" defaultLanguage="markdown" value={markdown} onChange={handleEditorChange} />
            </div>
            <Button id="send-button" appearance="primary" onClick={() => send(markdown, setAssistant, historyItems, setHistoryItems, progressRef, messages, setMessages, conversations, setConversations, selectedModel)} style={{ width: '100%' }} icon={<SendFilled />}>{t('send')}</Button>
          </div>
          <div id="preview">
            <Markdown children={assistant} />
          </div>
        </main>
      </div>
    </FluentProvider>
  );
};

export default App;

(window as any).apiKey = "";
(window as any).setOpenAIAPIKey = (apiKey: string) => {
  console.log(apiKey);
  (window as any).apiKey = apiKey
}

(window as any).setGrokAPIKey = (apiKey: string) => {
  console.log(apiKey);
  (window as any).apiKey = apiKey
}

(window as any).languageModel = "";
(window as any).setLanguageModel = (model: string) => {
  console.log(model);
  (window as any).languageModel = model
}

(window as any).assistant = "";
(window as any).setAssistant = (assistant: string) => {
  (window as any).assistant = assistant
}

(window as any).getAssistant = () => {
  (window as any).chrome.webview.postMessage(`{"type": "get-assistant", "data": "${encodeBase64UTF8((window as any).assistant)}"}`)
}

(window as any).setEditorText = (text: string) => {
  eval("monaco").editor.getEditors()[0].setValue(text)
}

(window as any).setOutputText = (text: string) => {
  (window as any).window.markdown = text
  // (window as any).languageModel = model
}

(window as any).setEditorBase64 = (base64: string) => {
  const text: string = decodeBase64UTF8(base64);
  (window as any).setEditorText(text)
  console.log("editor:", text);
}

(window as any).setOutputBase64 = (base64: string) => {
  const text: string = decodeBase64UTF8(base64);
  (window as any).setOutputText(text)
  console.log("output:", text);
  // (window as any).languageModel = model
}