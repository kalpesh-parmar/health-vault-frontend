import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"

const MicrosoftLogo = (props: SvgProps) => (
  <Svg viewBox="0 0 21 21" {...props}>
    <Path fill="#f25022" d="M0 0h10v10H0z"/>
    <Path fill="#7fba00" d="M11 0h10v10H11z"/>
    <Path fill="#00a4ef" d="M0 11h10v10H0z"/>
    <Path fill="#ffb900" d="M11 11h10v10H11z"/>
  </Svg>
)

export default MicrosoftLogo
