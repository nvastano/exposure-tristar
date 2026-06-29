export type RawFootageRow = {
  Id: string;
  Title: string;
  VideoUrl: string;
  Date?: string;
  CreatedAt?: string;
};

export type RawFootageNoteRow = {
  Id: string;
  FootageId: string;
  Player: string;
  Note: string;
  GroupId?: string;
  CreatedAt?: string;
};
