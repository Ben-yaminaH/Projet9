/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import Bills from "../containers/Bills.js";
import { screen, waitFor, fireEvent } from "@testing-library/dom";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import router from '../app/Router.js';

jest.mock("../__mocks__/store", () => ({
  bills: jest.fn(),
}));

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock });
      window.localStorage.setItem('user', JSON.stringify({
        type: 'Employee',
      }));
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId('icon-window'));
      const windowIcon = screen.getByTestId('icon-window');

      expect(windowIcon).toHaveClass('active-icon');
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills.sort((a, b) => (a.date < b.date) ? 1 : -1) });
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML);
      const antiChrono = (a, b) => ((a < b) ? 1 : -1);
      const datesSorted = [...dates].sort(antiChrono);
      expect(dates).toEqual(datesSorted);
    });
  });

  describe("Bills Container", () => {
    let onNavigate;
    let mockStoreInstance;

    beforeEach(() => {
      onNavigate = jest.fn();
      mockStoreInstance = {
        bills: jest.fn(() => ({
          list: jest.fn(() => Promise.resolve(bills)),
        })),
      };

      document.body.innerHTML = `
        <div>
          <button data-testid="btn-new-bill"></button>
          <div data-testid="icon-eye" data-bill-url="http://example.com/bill.jpg"></div>
          <div id="modaleFile">
            <div class="modal-body"></div>
          </div>
        </div>
      `;
    });

    describe("handleClickNewBill", () => {
      test("should navigate to NewBill route when button is clicked", () => {
        const billsInstance = new Bills({ document, onNavigate, store: mockStoreInstance, localStorage: null });
        const newBillButton = screen.getByTestId("btn-new-bill");
        fireEvent.click(newBillButton);
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"]);
      });
    });

    describe("handleClickIconEye", () => {
      test("should display the modal with the correct image", () => {
        const billsInstance = new Bills({ document, onNavigate, store: mockStoreInstance, localStorage: null });
        const iconEye = screen.getByTestId("icon-eye");
        const modaleFile = document.getElementById("modaleFile");
        $.fn.modal = jest.fn(() => modaleFile.classList.add("show"));

        fireEvent.click(iconEye);

        const modalBody = modaleFile.querySelector(".modal-body");
        const img = modalBody.querySelector("img");

        expect(modaleFile).toHaveClass("show");
        expect(img).toHaveAttribute("src", "http://example.com/bill.jpg");
        expect(img).toHaveStyle("width: 50%");
      });
    });

    describe("getBills", () => {
      test("should fetch and format bills correctly", async () => {
        const billsInstance = new Bills({ document, onNavigate, store: mockStoreInstance, localStorage: null });
        const result = await billsInstance.getBills();

        expect(result.length).toBe(bills.length);
        expect(result[0]).toHaveProperty("date");
        expect(result[0]).toHaveProperty("status");
      });

      test("should log an error for invalid data during formatting", async () => {
        const invalidBills = [{ id: 1, date: "invalid-date", status: "refused" }];
        mockStoreInstance.bills.mockResolvedValueOnce({
          list: jest.fn(() => Promise.resolve(invalidBills)),
        });
        console.log = jest.fn();

        const billsInstance = new Bills({ document, onNavigate, store: mockStoreInstance, localStorage: null });
        await billsInstance.getBills();

        expect(console.log).toHaveBeenCalledWith(expect.any(Error), "for", invalidBills[0]);
      });
    });

    test("apiFails404Error", async () => {
      mockStoreInstance.bills.mockImplementationOnce(() => ({
        list: () => Promise.reject(new Error("error 404")),
      }));

      const html = BillsUI({ error: "error 404" });
      document.body.innerHTML = html;

      const message = await screen.getByText(/error 404/);
      expect(message).toBeTruthy();
    });
  });

  test("apiFails500Error", async () => {
    // Mock the store to simulate a 500 error
    mockStore.bills.mockImplementationOnce(() => ({
      list: () => Promise.reject(new Error("error 500")),
    }));
  
    // Render the Bills UI with the error
    const html = BillsUI({ error: "error 500" });
    document.body.innerHTML = html;
  
    // Check if the error message is displayed in the DOM
    const message = await screen.getByText(/error 500/);
    expect(message).toBeTruthy();
  });


});
