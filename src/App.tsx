import React, { useState, useRef } from 'react';
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

const getSystemTheme = (): string => {
  const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
  return darkThemeMq.matches ? "dark" : "light";
}

interface User {
  label: string
}

interface Author {
  label: string
}

interface Message{
  role: string,
  content: string
}

interface HistoryItem {
  userTitle: User
}

interface HistoryProps {
  items: HistoryItem[]
  width: number
}

export const History: React.FC<HistoryProps> = ({ items, width }) => {
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
            <TableHeaderCell key={column.columnKey}>
              {column.label}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.userTitle.label}>
            <TableCell>
              <TableCellLayout truncate>
                {item.userTitle.label}
              </TableCellLayout>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const apiKey = Cookies.get('OPENAI_API_KEY');
let openai: OpenAI | null = null
if(apiKey){
  openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  });
}

const Send = async(
  markdown: string, 
  setAssistant: React.Dispatch<React.SetStateAction<string>>, 
  historyItems: HistoryItem[], 
  setItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>,
  progressRef: React.MutableRefObject<null>,
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  setMessages: React.Dispatch<React.SetStateAction<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>>
) => {
  console.log("SEND:", markdown)
  if(openai != null){
    const userMessage: ChatCompletionMessageParam = {
      role: "user",
      content: markdown
    }
    const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [...messages, userMessage]
    // プログレスバーの表示
    if(progressRef.current){
      const current: HTMLElement = progressRef.current
      current.classList.remove("hidden")
    }
    // 送信
    const chatCompletion = await openai.chat.completions.create({
      messages: requestMessages,
      model: "gpt-4o-mini",
    })
    // プログレスバーの非表示
    if(progressRef.current){
      const current: HTMLElement = progressRef.current
      current.classList.add("hidden")
    }
    const assistant = chatCompletion.choices[0].message.content
    if(assistant){
      // Message リストに追加
      const assistantMessage: ChatCompletionMessageParam = {
        role: "assistant",
        content: assistant
      }
      setMessages([...requestMessages, assistantMessage])

      // Markdown を表示
      setAssistant(assistant)

      const user1line = markdown.split("\n")[0]
      const historyItem: HistoryItem = {
        userTitle: { label: user1line },
      }

      // 履歴アイテムに追加
      setItems([historyItem, ...historyItems])
    }
  }
}

const App = () => {
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([])
  const { t } = useTranslation()
  const theme = getSystemTheme() === "light" ? webLightTheme : webDarkTheme;
  const vsTheme = getSystemTheme() === "light" ? "vs-light" : "vs-dark";

  const [markdown, setMarkdown] = useState("");
  const [assistant, setAssistant] = useState("");
  const handleEditorChange = (newValue: string | undefined) => {
    setMarkdown(newValue || "");
  }

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([
  ])

  const historyWidth: number = 244
  // const historyWidth: number = 0

  const progressRef = useRef(null)

  return (
    <FluentProvider theme={theme}>
      <div className="App">
        <ProgressBar ref={progressRef} style={{height: '4px'}} className="hidden" id="progress-bar" />
        <main>
          <div id="editor">
            <div style={{ borderRadius: '4px', overflow: 'hidden' }}>
              <Editor height="calc(100vh - 72px)" defaultLanguage="markdown" value={markdown} theme={vsTheme} onChange={handleEditorChange} />
            </div>
            <Button id="send-button" appearance="primary" onClick={() => Send(markdown, setAssistant, historyItems, setHistoryItems, progressRef, messages, setMessages)} style={{ width: '100%' }} icon={<SendFilled />}>{t('send')}</Button>
          </div>
          <div id="preview">
            <Markdown children={assistant} />
          </div>
          <div id="history">
            <History items={historyItems} width={historyWidth} />
          </div>
        </main>
      </div>
    </FluentProvider>
  );
}

export default App;
