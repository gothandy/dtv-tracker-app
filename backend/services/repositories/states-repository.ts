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
  /** "{Type} {Name}", for readability in SharePoint only (stateTitle). */
  Title?: string;
}

/** A State's Title: "{Type} {Name}" (e.g. "Charity Membership Accepted"). */
export const stateTitle = (type: string, name: string) => `${type} ${name}`;

class StatesRepository {
  private get listGuid(): string { return sharePoint.lists.states; }

  /** Not cached: the migration reads it fresh, and the maintainer edits it directly. */
  async getAll(): Promise<SharePointState[]> {
    const items = await sharePointClient.getListItems(this.listGuid, `ID,Title,${STATE_NAME},${STATE_TYPE}`);
    return items.map((item: Record<string, any>) => ({ ID: item.ID, Name: item[STATE_NAME], Type: item[STATE_TYPE], Title: item.Title }));
  }

  /**
   * Title is "{Type} {Name}" (e.g. "Charity Membership Accepted"), so SharePoint's own dropdowns
   * and views read naturally; the app reads Name and RecordType.
   */
  async create(fields: { Name: string; Type: string }): Promise<number> {
    return await sharePointClient.createListItem(this.listGuid, {
      Title: stateTitle(fields.Type, fields.Name),
      [STATE_NAME]: fields.Name,
      [STATE_TYPE]: fields.Type,
    });
  }

  async updateTitle(id: number, title: string): Promise<void> {
    await sharePointClient.updateListItem(this.listGuid, id, { Title: title });
  }
}

export const statesRepository = new StatesRepository();
