import { useState, useRef, useEffect } from 'react';
import '../styles/App.css';
import { FluentProvider, teamsLightTheme, teamsDarkTheme, Button, ProgressBar, Select } from '@fluentui/react-components';
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { SendFilled } from "@fluentui/react-icons";
import History from '../components/History/History';
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
    (window as any).chrome.webview.postMessage(`{"type": "get", "data": "apiKey"}`)
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
  selectedModel: string
): Promise<string | null> => {
  if (openai == null)
    return null
  // console.log(selectedModel)
  const model = await getLanguageModel();
  console.log(model)
  const stream = await openai.chat.completions.create({
    model: model,
    messages: messages,
    stream: true,
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
  const assistant = await getStreamingResponse(openai, requestMessages, setAssistant, selectedModel)
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
    setAssistant(assistant)

    const user1line = markdown.split("\n")[0]
    document.title = user1line
    const historyItem: HistoryItem = {
      userTitle: { label: user1line },
      uuid: uuid
    }

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
      }
    }

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
            <div style={{ borderRadius: '4px', overflow: 'hidden' }}>
              <Editor theme={vsTheme} options={{ wordWrap: 'on' }} height="calc(100vh - 80px)" defaultLanguage="markdown" value={markdown} onChange={handleEditorChange} />
            </div>
            <Button id="send-button" appearance="primary" onClick={() => send(markdown, setAssistant, historyItems, setHistoryItems, progressRef, messages, setMessages, conversations, setConversations, selectedModel)} style={{ width: '100%' }} icon={<SendFilled />}>{t('send')}</Button>
          </div>
          <div id="preview">
            <Markdown children={assistant} />
          </div>
          {/* <div id="history" style={{width: historyWidth}} className={historyClose}>
            <History items={historyItems} conversations={conversations} setMarkdown={setMarkdown} setAssistant={setAssistant} />
            <div id="history-open-close">
              <Button id="history-open-close-button" onClick={() => closeHistory()}>{t('close')}</Button>
            </div>
          </div> */}
        </main>
      </div>
    </FluentProvider>
  );
};

export default App;

(window as any).apiKey = "";
(window as any).setAPIKey = (apiKey: string) => {
  console.log(apiKey);
  (window as any).apiKey = apiKey
}

(window as any).languageModel = "";
(window as any).setLanguageModel = (model: string) => {
  console.log(model);
  (window as any).languageModel = model
}