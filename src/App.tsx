import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import { FluentProvider, webLightTheme, webDarkTheme, Button, Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, TableCellLayout, ProgressBar } from '@fluentui/react-components';
import {
  SendFilled
} from "@fluentui/react-icons";
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import OpenAI from "openai";
import Cookies from 'js-cookie';
import { useTranslation } from 'react-i18next';
import "./i18n"
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { v4 as uuidv4 } from 'uuid';

const getSystemTheme = (): string => {
  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  return darkThemeMq.matches ? "dark" : "light";
}

const generateUUID = (): string => {
  return uuidv4();
}

interface User {
  label: string
}

interface Conversation {
  uuid: string
  user: string
  assistant: string
}

interface HistoryItem {
  userTitle: User,
  uuid: string
}

interface HistoryProps {
  items: HistoryItem[]
  width: number
  conversations: Conversation[]
  setMarkdown: React.Dispatch<React.SetStateAction<string>>
  setAssistant: React.Dispatch<React.SetStateAction<string>>
}

const clickHistory = (
  uuid: string,
  conversations: Conversation[],
  setMarkdown: React.Dispatch<React.SetStateAction<string>>,
  setAssistant: React.Dispatch<React.SetStateAction<string>>
) => {
  const contents: Conversation[] = conversations.filter(e => e.uuid === uuid)
  if (contents.length > 0) {
    const content: Conversation = contents[0]
    const user = content.user
    const assistant = content.assistant
    setMarkdown(user)
    setAssistant(assistant)
    console.log(user, assistant)
  }
}

const History: React.FC<HistoryProps> = ({ items, width, conversations, setMarkdown, setAssistant }) => {
  const { t } = useTranslation()

  const columns =
    [
      { columnKey: "user", label: t('history') }
    ]

  return (
    <Table arial-label="Default table" style={{ maxWidth: width + "px" }}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHeaderCell key={column.columnKey} className='table-header-cell'>
              {column.label}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.userTitle.label} className='table-row'>
            <TableCell className='table-cell'>
              <TableCellLayout className='table-cell-layout' truncate id={item.uuid} onClick={() => clickHistory(item.uuid, conversations, setMarkdown, setAssistant)}>
                {item.userTitle.label}
              </TableCellLayout>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const fetchVersion = async() => {
  let port = 50027
  while(port <= 50050){
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/version`);
      // レスポンスが正常かどうかをチェック
      const data = await response.text();
      if (data.startsWith("yukari-engine")){
        return port;
      }
    } catch (error) {
      console.error('Error fetching version:', error);
      port += 1
    }
  }
  return null;
}

const getAPIKeyFromServer = async(port: number) => {
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

const getAPIKey = async() => {
  const version = await fetchVersion()
  if(!version)
    return
  const port = version
  const apiKey = await getAPIKeyFromServer(port)
  if(!apiKey || apiKey == ""){
    return null
  }
  return apiKey
  // Cookies.set('OPENAI_API_KEY', apiKey);
  console.log("Get an apikey from server")
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
  setAssistant: React.Dispatch<React.SetStateAction<string>>
): Promise<string | null> => {
  if (openai == null)
    return null
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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

const Send = async (
  markdown: string,
  setAssistant: React.Dispatch<React.SetStateAction<string>>,
  historyItems: HistoryItem[],
  setItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>,
  progressRef: React.MutableRefObject<null>,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  setMessages: React.Dispatch<React.SetStateAction<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>>,
  conversations: Conversation[],
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
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
  useEffect(() => {
    getAPIKey()
    console.log("init.")
  }, [])

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([])
  const { t } = useTranslation()
  const theme = getSystemTheme() === "light" ? webLightTheme : webDarkTheme
  const vsTheme = getSystemTheme() === "light" ? "vs-light" : "vs-dark"

  const [markdown, setMarkdown] = useState("")
  const [assistant, setAssistant] = useState("")
  const handleEditorChange = (newValue: string | undefined) => {
    setMarkdown(newValue || "")
  }

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([
  ])

  const historyWidth: number = 244
  // const historyWidth: number = 0

  const progressRef = useRef(null)

  return (
    <FluentProvider theme={theme}>
      <div className="App">
        <ProgressBar ref={progressRef} style={{ height: '4px' }} className="hidden" id="progress-bar" />
        <main>
          <div id="editor">
            <div style={{ borderRadius: '4px', overflow: 'hidden' }}>
              <Editor options={{ wordWrap: 'on' }} height="calc(100vh - 72px)" defaultLanguage="markdown" value={markdown} theme={vsTheme} onChange={handleEditorChange} />
            </div>
            <Button id="send-button" appearance="primary" onClick={() => Send(markdown, setAssistant, historyItems, setHistoryItems, progressRef, messages, setMessages, conversations, setConversations)} style={{ width: '100%' }} icon={<SendFilled />}>{t('send')}</Button>
          </div>
          <div id="preview">
            <Markdown children={assistant} />
          </div>
          <div id="history">
            <History items={historyItems} width={historyWidth} conversations={conversations} setMarkdown={setMarkdown} setAssistant={setAssistant} />
          </div>
        </main>
      </div>
    </FluentProvider>
  );
}

export default App;
