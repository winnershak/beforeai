declare module 'react-native-image-base64' {
  const ImgToBase64: {
    getBase64String: (uri: string) => Promise<string>;
  };
  export default ImgToBase64;
} 