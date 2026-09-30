import React from "react";
import { ScrollView, View } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";
import { safeArray } from "../../utils/arrayUtils";

export interface FilterTabItem {
  key: string;
  label?: string;
  count?: number;
}

export type FilterTabOption = string | FilterTabItem;

interface FilterTabsProps {
  data: readonly FilterTabOption[] | FilterTabOption[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  counts?: Record<string, number>;
  isDark?: boolean;
}

const FilterTabs = ({
  data,
  activeTab,
  onSelectTab,
  counts,
  isDark,
}: FilterTabsProps) => {
  return (
    <FilterWrapper>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {safeArray(data).map((item) => {
          const itemKey = typeof item === "string" ? item : item.key;
          const baseLabel = typeof item === "string" ? item : (item.label || item.key);
          const count =
            typeof item === "object" && item.count !== undefined
              ? item.count
              : counts && counts[itemKey] !== undefined
                ? counts[itemKey]
                : undefined;

          const displayLabel = count !== undefined ? `${baseLabel} (${count})` : baseLabel;
          const isActive = activeTab === itemKey;

          return (
            <TabItem
              key={itemKey}
              active={isActive}
              onPress={() => {
                onSelectTab(itemKey);
              }}
              activeOpacity={0.8}
              isDark={isDark}
            >
              {isActive ? (
                <LinearGradient
                  colors={["#4f46e5", "#3b82f6", "#2563eb"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingHorizontal: 20, paddingVertical: 10 }}
                >
                  <TabText active={true}>{displayLabel}</TabText>
                </LinearGradient>
              ) : (
                <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
                  <TabText active={false} isDark={isDark}>
                    {displayLabel}
                  </TabText>
                </View>
              )}
            </TabItem>
          );
        })}
      </ScrollView>
    </FilterWrapper>
  );
};

export default FilterTabs;

const FilterWrapper = styled.View`
  background-color: transparent;
`;

const TabItem = styled.TouchableOpacity<{ active: boolean; isDark?: boolean }>`
  border-radius: 25px;
  overflow: hidden;
  background-color: ${({
  active,
  isDark,
}: {
  active: boolean;
  isDark?: boolean;
}) => (active ? "transparent" : isDark ? "#1e293b" : "white")};
  margin-right: 12px;
  border-width: 1px;
  border-color: ${({
  active,
  isDark,
}: {
  active: boolean;
  isDark?: boolean;
}) => (active ? "#3b83caff" : isDark ? "#334155" : "#428fdcff")};
  elevation: 3;
  shadow-color: #000;
  shadow-offset: 0px 2px;
  shadow-opacity: 0.1;
  shadow-radius: 4px;
`;

const TabText = styled.Text<{ active: boolean; isDark?: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ active, isDark }: { active: boolean; isDark?: boolean }) =>
    active ? "white" : isDark ? "#cbd5e1" : "#64748b"};
`;
