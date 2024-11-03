import React, { useState } from 'react';
import './App.css';
import { FluentProvider, webLightTheme, webDarkTheme, Button, Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, TableCellLayout } from '@fluentui/react-components';
import {
  SendFilled
} from "@fluentui/react-icons";
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import "./i18n"

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

interface Item {
  user: User
  author: Author
}

interface HistoryProps {
  items: Item[]
  width: number
}

export const History: React.FC<HistoryProps> = ({ items, width }) => {
  const { t } = useTranslation()

  const columns =
    [
      { columnKey: "user", label: t('user') },
      { columnKey: "assistant", label: t('assistant') }
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
          <TableRow key={item.user.label}>
            <TableCell>
              <TableCellLayout truncate>
                {item.user.label}
              </TableCellLayout>
            </TableCell>
            <TableCell>
              <TableCellLayout truncate>
                {item.author.label}
              </TableCellLayout>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};


const App = () => {
  const { t } = useTranslation()
  const theme = getSystemTheme() === "light" ? webLightTheme : webDarkTheme;
  const vsTheme = getSystemTheme() === "light" ? "vs-light" : "vs-dark";

  const [markdown, setMarkdown] = useState("");
  const handleEditorChange = (newValue: string | undefined) => {
    setMarkdown(newValue || "");
  }

  const [items, setItems] = useState([
    {
      user: { label: "Hello" },
      author: { label: "World" }
    }
  ])

  const historyWidth: number = 348
  // const historyWidth: number = 0

  return (
    <FluentProvider theme={theme}>
      <div className="App">
        <main>
          <div id="editor">
            <div style={{ borderRadius: '4px', overflow: 'hidden' }}>
              <Editor height="calc(100vh - 72px)" defaultLanguage="markdown" defaultValue="" theme={vsTheme} onChange={handleEditorChange} />
            </div>
            <Button id="send-button" appearance="primary" style={{ width: '100%' }} icon={<SendFilled />}>{t('send')}</Button>
          </div>
          <div id="preview">
            <Markdown children={markdown} />
          </div>
          <div id="history">
            <History items={items} width={historyWidth} />
          </div>
        </main>
      </div>
    </FluentProvider>
  );
}

export default App;
