import React from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

const SearchBar = ({
  value,
  onChangeText,
  placeholder = "Search...",
}: SearchBarProps) => {
  return (
    <SearchContainer>
      <SearchIcon>
        <Ionicons name="search-outline" size={18} color="#cbd5e1" />
      </SearchIcon>
      <SearchInput
        placeholder={placeholder}
        placeholderTextColor="#cbd5e1"
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <ClearButton onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={18} color="#cbd5e1" />
        </ClearButton>
      )}
    </SearchContainer>
  );
};

export default SearchBar;

const SearchContainer = styled.View`
  flex-direction: row;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding-horizontal: 12px;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.18);
  height: 44px;
`;

const SearchIcon = styled.View`
  margin-right: 6px;
`;

const SearchInput = styled.TextInput`
  flex: 1;
  color: white;
  font-size: 14px;
  font-weight: 500;
  height: 100%;
  padding-horizontal: 4px;
`;

const ClearButton = styled.TouchableOpacity`
  padding: 4px;
`;
