import React from "react";
import { ScrollView, Linking, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import ScreenHeader from "../../components/shared/Header";

const AboutScreen = () => {
  const navigation = useNavigation();

  return (
    <Container>
      <StatusBar style="dark" />
      <ScreenHeader title="About Us" showBack={true} />

      <StyledScrollView showsVerticalScrollIndicator={false}>
        <BrandSection>
          <LogoContainer>
            <MaterialCommunityIcons
              name="shield-check"
              size={50}
              color="white"
            />
          </LogoContainer>
          <VersionBadge>Version 2.0.4</VersionBadge>
          <MissionText>
            Securing your medical legacy through decentralized accessibility and
            modern design.
          </MissionText>
        </BrandSection>

        <SectionTitle>Our Mission</SectionTitle>
        <Card>
          <IconCircle style={{ backgroundColor: "#eff6ff" }}>
            <MaterialCommunityIcons
              name="eye-outline"
              size={24}
              color="#2563eb"
            />
          </IconCircle>
          <CardContent>
            <CardTitle>Vision</CardTitle>
            <CardDescription>
              To be the world's most trusted digital vault for personal health
              information.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <IconCircle style={{ backgroundColor: "#f0fdf4" }}>
            <MaterialCommunityIcons
              name="lock-check-outline"
              size={24}
              color="#22c55e"
            />
          </IconCircle>
          <CardContent>
            <CardTitle>Privacy First</CardTitle>
            <CardDescription>
              Your data is encrypted locally. Not even we can see your records.
            </CardDescription>
          </CardContent>
        </Card>

        <SectionTitle>Our Projects</SectionTitle>
        <HorizontalScroll horizontal showsHorizontalScrollIndicator={false}>
          <ProjectCard>
            <ProjectIcon bg="#fef3c7">
              <MaterialCommunityIcons name="brain" size={24} color="#d97706" />
            </ProjectIcon>
            <ProjectName>Health AI</ProjectName>
            <ProjectStatus>Coming Soon</ProjectStatus>
          </ProjectCard>

          <ProjectCard>
            <ProjectIcon bg="#ede9fe">
              <MaterialCommunityIcons
                name="family-tree"
                size={24}
                color="#7c3aed"
              />
            </ProjectIcon>
            <ProjectName>Family Vault</ProjectName>
            <ProjectStatus>Beta</ProjectStatus>
          </ProjectCard>
        </HorizontalScroll>

        <SectionTitle>Get in Touch</SectionTitle>
        <ContactGrid>
          <ContactButton
            onPress={() => Linking.openURL("mailto:support@healthvault.com")}
          >
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color="black"
            />
            <ContactText>Email Us</ContactText>
          </ContactButton>

          <ContactButton
            onPress={() => Linking.openURL("https://techrover.us")}
          >
            <MaterialCommunityIcons name="web" size={24} color="black" />
            <ContactText>Website</ContactText>
          </ContactButton>
        </ContactGrid>

        <FooterText>
          © 2026 HealthVault Inc.{"\n"}TechRover Solutions PVT. LTD.
        </FooterText>
      </StyledScrollView>
    </Container>
  );
};

export default AboutScreen;

const Container = styled.SafeAreaView`
  flex: 1;
  background-color: #ffffff;
`;

const StyledScrollView = styled.ScrollView`
  flex: 1;
  padding: 20px;
`;

const BrandSection = styled.View`
  align-items: center;
  margin-top: 10px;
  margin-bottom: 30px;
`;

const LogoContainer = styled.View`
  width: 70px;
  height: 70px;
  border-radius: 15px;
  background-color: #2563eb;
  justify-content: center;
  align-items: center;
  shadow-color: #2563eb;
  shadow-opacity: 0.5;
  shadow-radius: 20px;
  elevation: 10;
`;

const VersionBadge = styled.Text`
  background-color: #f1f5f9;
  color: #64748b;
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  margin-top: 7px;
  overflow: hidden;
`;

const MissionText = styled.Text`
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: #475569;
  margin-top: 15px;
  line-height: 20px;
  padding-horizontal: 19px;
`;

const SectionTitle = styled.Text`
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 15px;
`;

const Card = styled.View`
  flex-direction: row;
  background-color: #ffffff;
  padding: 16px;
  border-radius: 20px;
  margin-bottom: 12px;
  border: 1px solid #b7c4d1;
  align-items: center;
`;

const IconCircle = styled.View`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  justify-content: center;
  align-items: center;
`;

const CardContent = styled.View`
  margin-left: 10px;
  flex: 1;
`;

const CardTitle = styled.Text`
  font-size: 16px;
  font-weight: 700;
  color: blue;
`;

const CardDescription = styled.Text`
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
`;

const HorizontalScroll = styled.ScrollView`
  margin-bottom: 20px;
`;

const ProjectCard = styled.View`
  background-color: #ffffff;
  width: 140px;
  padding: 16px;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  margin-right: 15px;
  align-items: center;
`;

const ProjectIcon = styled.View<{ bg: string }>`
  background-color: ${(props: { bg: string }) => props.bg};
  padding: 12px;
  border-radius: 15px;
  margin-bottom: 10px;
`;

const ProjectName = styled.Text`
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
`;

const ProjectStatus = styled.Text`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
`;

const ContactGrid = styled.View`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 40px;
`;

const ContactButton = styled.TouchableOpacity`
  flex: 0.48;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  background-color: #f8fafc;
  padding: 15px;
  border-radius: 18px;
  border: 1px solid black;
`;

const ContactText = styled.Text`
  margin-left: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
`;

const FooterText = styled.Text`
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 60px;
  line-height: 18px;
`;
