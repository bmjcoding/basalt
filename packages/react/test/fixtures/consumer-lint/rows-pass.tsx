// Point 7: a native button in one of Basalt's rows (TableRow, PanelRow) is the row's action, not an ordinary button.
import { PanelRow, Table, TableBody, TableCell, TableRow } from "@srasyndicate/basalt";

export function Rows({ open }: { open: () => void }) {
  return (
    <>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>
              <button type="button" onClick={open}>Open</button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <PanelRow>
        <button type="button" onClick={open}>Open</button>
      </PanelRow>
    </>
  );
}
