import { AssociationDto, BranchDto, ChapterDto } from './structure.models';
import { PartyDto } from './parties.models';

export interface ElectionPositionDto {
  id: string;
  title: string;
  order: number;
}

export interface CandidateDto {
  id: string;
  firstName: string;
  lastName: string;
  dni?: string;
  photoUrl?: string;
  positionId: string;
  position?: ElectionPositionDto;
}

export interface CandidateListDto {
  id: string;
  name: string;
  number?: number;
  politicalPartyId?: string;
  politicalParty?: PartyDto;
  candidates: CandidateDto[];
}

export interface ElectionDto {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED';
  scope: 'NATIONAL' | 'ASSOCIATION' | 'BRANCH' | 'CHAPTER';
  associationId: string;
  branchId?: string;
  chapterId?: string;
  association?: AssociationDto;
  branch?: BranchDto;
  chapter?: ChapterDto;
  positions: ElectionPositionDto[];
  candidateLists?: CandidateListDto[];
}

export interface CreateElectionPositionDto {
  title: string;
  order: number;
}

export interface CreateElectionDto {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  scope: 'NATIONAL' | 'ASSOCIATION' | 'BRANCH' | 'CHAPTER';
  associationId: string;
  branchId?: string;
  chapterId?: string;
  positions: CreateElectionPositionDto[];
}

export interface CreateCandidateListDto {
    name: string;
    number?: number;
    politicalPartyId?: string;
    electionId?: string;
}

export interface CreateCandidateDto {
    firstName: string;
    lastName: string;
    dni?: string;
    candidateListId?: string;
    positionId: string;
    photoUrl?: string;
}
