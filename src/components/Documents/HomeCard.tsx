// import React from "react";
// import styled from "styled-components/native";
// import { GestureResponderEvent } from "react-native";

// interface HomeCardProps {
//   title: string;
//   subtitle: string;
//   onPress?: (event: GestureResponderEvent) => void;
// }

// const HomeCard = ({
//   title,
//   subtitle,
//   onPress,
// }: HomeCardProps) => {
//   return (
//     <CardTouchable activeOpacity={0.85} onPress={onPress}>
//       <CardContainer>
//         <Title numberOfLines={1}>{title}</Title>
//         <Subtitle numberOfLines={2}>{subtitle}</Subtitle>
//         <Glow />
//       </CardContainer>
//     </CardTouchable>
//   );
// };

// export default HomeCard;

// const CardTouchable = styled.TouchableOpacity`
//   width: 48%;
//   margin-bottom: 16px;
// `;

// const CardContainer = styled.View`
//   height: 120px;
//   border-radius: 24px;
//   background-color: #ffffff;
//   justify-content: center;
//   align-items: center;
//   padding: 16px;
//   shadow-color: #2563eb;
//   shadow-opacity: 0.12;
//   shadow-radius: 16px;
//   elevation: 6;
//   overflow: hidden;
// `;

// const Title = styled.Text`
//   font-size: 16px;
//   font-weight: 800;
//   color: #0f172a;
//   text-align: center;
// `;

// const Subtitle = styled.Text`
//   font-size: 12px;
//   color: #64748b;
//   margin-top: 6px;
//   text-align: center;
//   line-height: 16px;
// `;

// const Glow = styled.View`
//   position: absolute;
//   bottom: -25px;
//   right: -25px;
//   width: 100px;
//   height: 100px;
//   background-color: rgba(37, 99, 235, 0.06);
//   border-radius: 50px;
// `;


import React from "react";
import styled from "styled-components/native";
import { GestureResponderEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface HomeCardProps {
  title: string;
  subtitle: string;
  onPress?: (event: GestureResponderEvent) => void;
  accentColor?: string;
}

const getDefaultIcon = (title: string) => {
  const t = title.toLowerCase();

  if (t.includes("family")) return "people-outline";
  if (t.includes("medical")) return "document-text-outline";
  if (t.includes("insurance")) return "shield-checkmark-outline";
  if (t.includes("medication")) return "medkit-outline";

  return "folder-outline";
};

const HomeCard: React.FC<HomeCardProps> = ({
  title,
  subtitle,
  onPress,
  accentColor = "#2563eb",
}) => {
  const icon = getDefaultIcon(title);

  return (
    <CardTouchable activeOpacity={0.9} onPress={onPress}>
      <BorderRing accentColor={accentColor}>
        <CardContainer>
          <ShimmerLine accentColor={accentColor} />

          <IconWrapper accentColor={accentColor}>
            <Ionicons name={icon} size={20} color={accentColor} />
          </IconWrapper>

          <TextGroup>
            <Title numberOfLines={1}>{title}</Title>
            <Subtitle numberOfLines={2}>{subtitle}</Subtitle>
          </TextGroup>
          <AccentDot accentColor={accentColor} />
        </CardContainer>
      </BorderRing>
    </CardTouchable>
  );
};

export default HomeCard;

const CardTouchable = styled.TouchableOpacity`
  width: 48%;
  margin-bottom: 16px;
`;

const BorderRing = styled.View<{ accentColor: string }>`
  border-radius: 24px;
  padding: 1.5px;
  background-color: ${({ accentColor }: any) => accentColor}20;
`;

const CardContainer = styled.View`
  height: 132px;
  border-radius: 22px;
  background-color: #ffffff;
  justify-content: flex-end;
  padding: 14px 16px 16px 16px;
  shadow-color: #2563eb;
  shadow-opacity: 0.1;
  shadow-radius: 14px;
  elevation: 5;
  overflow: hidden;
`;

const ShimmerLine = styled.View<{ accentColor: string }>`
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background-color: ${({ accentColor }: any) => accentColor}30;
  border-radius: 1px;
`;

const IconWrapper = styled.View<{ accentColor: string }>`
  position: absolute;
  top: 16px;
  left: 16px;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background-color: ${({ accentColor }: any) => accentColor}14;
  justify-content: center;
  align-items: center;
`;

const TextGroup = styled.View`
  margin-top: 6px;
`;

const Title = styled.Text`
  font-size: 15px;
  font-weight: 800;
  color: #0f172a;
`;

const Subtitle = styled.Text`
  font-size: 11.5px;
  color: #64748b;
  margin-top: 4px;
  line-height: 15px;
`;

const AccentDot = styled.View<{ accentColor: string }>`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ accentColor }: any) => accentColor};
  opacity: 0.8;
`;