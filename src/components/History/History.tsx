import React from 'react';
import { Table, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, TableCellLayout } from '@fluentui/react-components';
import { useTranslation } from 'react-i18next';
import { Conversation, HistoryItem } from '../../services/types';

interface HistoryProps {
  items: HistoryItem[];
  conversations: Conversation[];
  setMarkdown: React.Dispatch<React.SetStateAction<string>>;
  setAssistant: React.Dispatch<React.SetStateAction<string>>;
}

const History: React.FC<HistoryProps> = ({ items, conversations, setMarkdown, setAssistant }) => {
  const { t } = useTranslation();

  const clickHistory = (uuid: string) => {
    const content = conversations.find(e => e.uuid === uuid);
    if (content) {
      setMarkdown(content.user);
      setAssistant(content.assistant);
    }
  };

  return (
    <Table aria-label="Default table" id="history-table">
      <TableHeader>
        <TableRow>
          <TableHeaderCell>{t('history')}</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map(item => (
          <TableRow key={item.uuid}>
            <TableCell>
              <TableCellLayout onClick={() => clickHistory(item.uuid)}>
                {item.userTitle.label}
              </TableCellLayout>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default History;