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
  voteCount?: number;
  politicalParty?: PartyDto;
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
  votedPositionIds?: string[];
}

// =================================================================
// == Voting DTOs
// =================================================================

export interface VoteSelectionDto {
  candidateId: string;
  electionPositionId: string;
}

export interface BulkVoteDto {
  selections: VoteSelectionDto[];
}

// =================================================================
// == Creation DTOs
// =================================================================

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

// Results interfaces
export interface CandidateResultDto {
  candidateId: string;
  candidateName: string;
  positionId: string;
  positionTitle: string;
  listId: string;
  listName: string;
  partyName?: string;
  voteCount: number;
  percentage: number;
}

export interface ListResultDto {
  listId: string;
  listName: string;
  listNumber: number | null;
  partyName?: string;
  totalVotes: number;
  percentage: number;
  candidates: CandidateResultDto[];
}

export interface PositionResultDto {
  positionId: string;
  positionTitle: string;
  order: number;
  candidates: CandidateResultDto[];
}

export interface ElectionResultsDto {
  electionId: string;
  electionName: string;
  electionScope: string;
  electionStatus: string;
  associationName: string;
  branchName?: string;
  chapterName?: string;
  totalVotes: number;
  candidateResults: CandidateResultDto[];
  listResults: ListResultDto[];
  positionResults: PositionResultDto[];
}

export interface UpdateVoteCountDto {
  voteCount: number;
}

