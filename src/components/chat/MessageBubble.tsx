import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { format } from "date-fns";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.75;

interface Message {
  id: string;
  role: "ai" | "user";
  text: string;
  documents?: { id: string; fileName: string; }[];
  createdAt?: string | Date;
}

interface MessageBubbleProps {
  message: Message;
  isDark: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isDark }) => {
  const isUser = message.role === "user";
  const timeString = message.createdAt ? format(new Date(message.createdAt), "hh:mm a") : "";

  const renderInlineBold = (text: string, keyPrefix: string, textColor: string) => {
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return (
      <Text style={{ color: textColor }} key={keyPrefix}>
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            return (
              <Text key={`${keyPrefix}-bold-${index}`} style={styles.boldText}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

  const renderMarkdown = (content: string, textColor: string, isUserMsg = false) => {
    // 1. Split by code blocks first
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const precedingText = content.substring(lastIndex, match.index);
      if (precedingText) {
        parts.push({ type: "text", content: precedingText });
      }
      parts.push({ type: "code", content: match[1].trim() });
      lastIndex = codeBlockRegex.lastIndex;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: "text", content: remainingText });
    }

    return parts.map((part, partIdx) => {
      if (part.type === "code") {
        return (
          <View
            key={`code-${partIdx}`}
            style={[
              styles.codeContainer,
              { backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "#f1f5f9" },
            ]}
          >
            <Text style={[styles.codeText, { color: isDark ? "#fda4af" : "#be123c" }]}>
              {part.content}
            </Text>
          </View>
        );
      }

      // Parse text parts line by line to detect lists, tables, and paragraphs
      const lines = part.content.split("\n");
      const listItems: string[] = [];
      const tableRows: string[][] = [];
      const elements: React.ReactNode[] = [];

      const flushList = (key: string) => {
        if (listItems.length > 0) {
          elements.push(
            <View key={`list-${key}`} style={styles.listContainer}>
              {listItems.map((item, itemIdx) => (
                <View key={`list-item-${key}-${itemIdx}`} style={styles.listItemRow}>
                  <Text style={[styles.bulletPoint, { color: textColor }]}>•</Text>
                  <Text style={styles.listItemText}>
                    {renderInlineBold(item, `list-bold-${key}-${itemIdx}`, textColor)}
                  </Text>
                </View>
              ))}
            </View>
          );
          listItems.length = 0;
        }
      };

      const flushTable = (key: string) => {
        if (tableRows.length > 0) {
          const isHeader = (rowIdx: number) => rowIdx === 0;
          elements.push(
            <View
              key={`table-${key}`}
              style={[
                styles.tableContainer,
                { borderColor: isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0" },
              ]}
            >
              {tableRows.map((row, rowIdx) => (
                <View
                  key={`table-row-${key}-${rowIdx}`}
                  style={[
                    styles.tableRow,
                    {
                      backgroundColor: isHeader(rowIdx)
                        ? (isDark ? "rgba(255,255,255,0.08)" : "#f8fafc")
                        : "transparent",
                      borderBottomWidth: rowIdx < tableRows.length - 1 ? 1 : 0,
                      borderBottomColor: isDark ? "rgba(255,255,255,0.12)" : "#e2e8f0",
                    },
                  ]}
                >
                  {row.map((cell, cellIdx) => (
                    <View key={`table-cell-${key}-${rowIdx}-${cellIdx}`} style={styles.tableCell}>
                      <Text
                        style={[
                          styles.tableCellText,
                          {
                            color: textColor,
                            fontWeight: isHeader(rowIdx) ? "700" : "500",
                          },
                        ]}
                      >
                        {cell.trim()}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
          tableRows.length = 0;
        }
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for table rows (e.g. starts and ends with |)
        if (line.startsWith("|") && line.endsWith("|")) {
          flushList(`pre-table-${i}`);
          const cells = line.split("|").slice(1, -1);
          // Ignore divider lines like |---|---|
          const isDivider = cells.every((c) => c.trim().match(/^-+$/));
          if (!isDivider) {
            tableRows.push(cells);
          }
          continue;
        } else {
          flushTable(`pre-list-${i}`);
        }

        // Check for list items
        if (line.startsWith("- ") || line.startsWith("* ") || line.startsWith("• ")) {
          const itemContent = line.substring(2);
          listItems.push(itemContent);
        } else {
          flushList(`pre-paragraph-${i}`);
          if (line) {
            elements.push(
              <View key={`para-${partIdx}-${i}`} style={[styles.paragraph, isUserMsg && { marginBottom: 0 }]}>
                <Text style={[styles.bodyText, isUserMsg && { textAlign: 'center' }]}>
                  {renderInlineBold(line, `para-bold-${partIdx}-${i}`, textColor)}
                </Text>
              </View>
            );
          }
        }
      }

      // Final flushes
      flushList(`final-${partIdx}`);
      flushTable(`final-${partIdx}`);

      return <View key={`block-${partIdx}`}>{elements}</View>;
    });
  };

  if (isUser) {
    return (
      <Animated.View entering={FadeInUp.springify()} style={styles.userWrapper}>
        {message.documents && message.documents.length > 0 && (
          <View style={styles.userDocumentsContainer}>
            {message.documents.map((doc, idx) => (
              <View key={doc.id || idx} style={styles.userDocumentBox}>
                <Ionicons name="document-text" size={24} color="#5B4BFF" />
                <Text style={styles.userDocumentText} numberOfLines={1}>{doc.fileName}</Text>
              </View>
            ))}
          </View>
        )}
        {message.text ? (
          <LinearGradient
            colors={["#5B4BFF", "#7C6CFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.userBubble, { alignItems: 'center', justifyContent: 'center' }]}
          >
            {renderMarkdown(message.text, "#ffffff", true)}
            {timeString ? <Text style={styles.userTime}>{timeString}</Text> : null}
          </LinearGradient>
        ) : null}
      </Animated.View>
    );
  }

  const aiBgColor = isDark ? "#1e293b" : "#ffffff";
  const aiTextColor = isDark ? "#f1f5f9" : "#334155";

  return (
    <Animated.View entering={FadeInUp.springify()} style={styles.aiWrapper}>
      <View style={styles.aiAvatar}>
        <LinearGradient
          colors={["#0f766e", "#0ea5e9"]}
          style={styles.aiAvatarGradient}
        >
          <Ionicons name="sparkles" size={14} color="#ffffff" />
        </LinearGradient>
      </View>
      {message.text ? (
        <View
          style={[
            styles.aiBubble,
            {
              backgroundColor: aiBgColor,
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "transparent",
              borderWidth: isDark ? 1 : 0,
            },
          ]}
        >
          {renderMarkdown(message.text, aiTextColor, false)}
          {timeString ? (
            <Text style={[styles.aiTime, { color: isDark ? "rgba(255,255,255,0.5)" : "#94a3b8" }]}>
              {timeString}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  userWrapper: {
    alignSelf: "flex-end",
    marginBottom: 12,
    paddingRight: 12,
  },
  userBubble: {
    maxWidth: MAX_BUBBLE_WIDTH,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 4,
  },
  userDocumentsContainer: {
    marginBottom: 8,
    alignItems: 'flex-end',
    gap: 8,
  },
  userDocumentBox: {
    width: 120,
    height: 90,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userDocumentText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  aiWrapper: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingLeft: 12,
  },
  aiAvatar: {
    marginRight: 8,
    alignSelf: "flex-end",
  },
  aiAvatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  aiBubble: {
    maxWidth: MAX_BUBBLE_WIDTH,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bodyText: {
    fontSize: 14.5,
    lineHeight: 21,
    fontWeight: "500",
  },
  boldText: {
    fontWeight: "800",
  },
  paragraph: {
    marginBottom: 6,
  },
  codeContainer: {
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    fontSize: 13,
    fontWeight: "700",
  },
  listContainer: {
    marginVertical: 4,
    paddingLeft: 6,
  },
  listItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 14,
    marginRight: 6,
    lineHeight: 20,
  },
  listItemText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "500",
  },
  tableContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginVertical: 8,
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 4,
  },
  tableCellText: {
    fontSize: 12,
    lineHeight: 16,
  },
  userTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  aiTime: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
});
