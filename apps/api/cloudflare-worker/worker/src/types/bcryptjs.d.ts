declare module 'bcryptjs' {
  const bcrypt: {
    compare: (data: string, encrypted: string) => Promise<boolean>;
    compareSync: (data: string, encrypted: string) => boolean;
    hash: (data: string, salt: number | string) => Promise<string>;
    hashSync: (data: string, salt: number | string) => string;
    genSalt: (rounds?: number) => Promise<string>;
    genSaltSync: (rounds?: number) => string;
  };
  export default bcrypt;
}
