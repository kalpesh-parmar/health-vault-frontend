import React from "react";
import { ScrollView, View } from "react-native";
import styled from "styled-components/native";
import { LinearGradient } from "expo-linear-gradient";

interface FilterTabsProps {
  data: readonly string[] | string[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isDark?: boolean;
}

const FilterTabs = ({
  data,
  activeTab,
  onSelectTab,
  isDark,
}: FilterTabsProps) => {
  return (
    <FilterWrapper>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
      >
        {data.map((item) => {
          const isActive = activeTab === item;
          return (
            <TabItem
              key={item}
              active={isActive}
              onPress={() => {
                console.log('item', item)
                onSelectTab(item)
              }}
              activeOpacity={0.8}
              isDark={isDark}
            >
              {isActive ? (
                <LinearGradient
                  colors={["#4f46e5", "#3b82f6", "#2563eb"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingHorizontal: 25, paddingVertical: 10 }}
                >
                  <TabText active={true}>{item}</TabText>
                </LinearGradient>
              ) : (
                <View style={{ paddingHorizontal: 25, paddingVertical: 10 }}>
                  <TabText active={false} isDark={isDark}>
                    {item}
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
