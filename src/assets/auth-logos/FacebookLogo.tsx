import * as React from "react"
import Svg, { SvgProps, Path } from "react-native-svg"

const FacebookLogo = (props: SvgProps) => (
  <Svg viewBox="0 0 48 48" {...props}>
    <Path fill="#1877F2" d="M48 24a24 24 0 1 0-27.75 23.7V30.94H14.1V24h6.15v-5.28c0-6.07 3.61-9.43 9.15-9.43 2.65 0 5.42.47 5.42.47v5.97h-3.05c-3 0-3.94 1.87-3.94 3.79V24h6.7l-1.07 6.94h-5.63v16.76A24.04 24.04 0 0 0 48 24z" />
    <Path fill="#fff" d="M31.8 30.94l1.07-6.94h-6.7v-4.5c0-1.92.93-3.79 3.94-3.79h3.05V9.74s-2.77-.47-5.42-.47c-5.54 0-9.15 3.36-9.15 9.43V24h-6.15v6.94h6.15v16.76a24.23 24.23 0 0 0 7.5 0V30.94h5.63z" />
  </Svg>
)

export default FacebookLogo
