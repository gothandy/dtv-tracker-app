/**
 * States Repository
 *
 * The States list (Records v2, #322): one item per State of a Record Type. Until PR 1 only
 * the Records migration reads and writes it.
 */

import { sharePointClient } from '../sharepoint-client';
import { sharePoint } from '../../config';
import { STATE_NAME, STATE_TYPE } from '../field-names';

export interface SharePointState {
  ID: number;
  /** The State's name (the Name column). */
  Name?: string;
  /** The Record Type it belongs to. */
  Type?: string;
}

class StatesRepository {
  private get listGuid(): string { return sharePoint.lists.states; }

  /** Not cached: the migration reads it fresh, and the maintainer edits it directly. */
  async getAll(): Promise<SharePointState[]> {
    const items = await sharePointClient.getListItems(this.listGuid, `ID,${STATE_NAME},${STATE_TYPE}`);
    return items.map((item: Record<string, any>) => ({ ID: item.ID, Name: item[STATE_NAME], Type: item[STATE_TYPE] }));
  }

  /** Title gets a copy of the Name only because SharePoint requires it; the app reads Name. */
  async create(fields: { Name: string; Type: string }): Promise<number> {
    return await sharePointClient.createListItem(this.listGuid, { Title: fields.Name, [STATE_NAME]: fields.Name, [STATE_TYPE]: fields.Type });
  }
}

export const statesRepository = new StatesRepository();
