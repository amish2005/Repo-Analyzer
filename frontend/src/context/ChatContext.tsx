"use client";

import { createContext, useContext } from 'react';

export type ChatContextItem = {
  id: string;
  title: string;
  content: string;
};

export type ChatContextType = {
  activeContexts: ChatContextItem[];
  addContext: (item: ChatContextItem) => void;
  removeContext: (id: string) => void;
  clearContexts: () => void;
  openChat: () => void;
};

export const ChatContext = createContext<ChatContextType>({
  activeContexts: [],
  addContext: () => {},
  removeContext: () => {},
  clearContexts: () => {},
  openChat: () => {},
});

export const useChatContext = () => useContext(ChatContext);
