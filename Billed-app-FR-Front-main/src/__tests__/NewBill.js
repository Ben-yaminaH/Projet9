/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from "@testing-library/dom";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";

const mockStore = {
  bills: jest.fn(() => ({
    create: jest.fn(() =>
      Promise.resolve({
        fileUrl: "https://mockurl.com/file.jpg",
        key: "12345",
      })
    ),
    update: jest.fn(() => Promise.resolve({})),
  })),
};

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    let newBill;

    beforeEach(() => {
      document.body.innerHTML = NewBillUI();
      Object.defineProperty(window, "localStorage", { value: localStorageMock });
      window.localStorage.setItem("user", JSON.stringify({ email: "test@test.com" }));

      newBill = new NewBill({
        document,
        onNavigate: jest.fn(),
        store: mockStore,
        localStorage: localStorageMock,
      });
    });

    // UNIT TESTS
    describe("Unit tests for handleChangeFile", () => {
      test("Then it should accept a valid file type and update file properties", async () => {
        const fileInput = screen.getByTestId("file");
        const validFile = new File(["mock"], "file.jpg", { type: "image/jpeg" });

        fireEvent.change(fileInput, { target: { files: [validFile] } });

        await waitFor(() => expect(mockStore.bills().create).toHaveBeenCalled());
        expect(newBill.fileUrl).toBe("https://mockurl.com/file.jpg");
        expect(newBill.fileName).toBe("file.jpg");
      });

      test("Then it should reject an invalid file type and reset the input", () => {
        const fileInput = screen.getByTestId("file");
        const invalidFile = new File(["mock"], "file.pdf", { type: "application/pdf" });

        window.alert = jest.fn();
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });

        expect(window.alert).toHaveBeenCalledWith(
          "Seuls les fichiers avec des extensions jpg, jpeg ou png sont autorisés."
        );
        expect(fileInput.value).toBe("");
      });
    });

    describe("Unit tests for handleSubmit", () => {
      test("Then it should call updateBill and navigate to Bills page", async () => {
        const form = screen.getByTestId("form-new-bill");
        newBill.fileUrl = "https://mockurl.com/file.jpg";
        newBill.fileName = "file.jpg";

        fireEvent.submit(form);

        await waitFor(() => expect(mockStore.bills().update).toHaveBeenCalled());
        expect(newBill.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
      });
    });

    // INTEGRATION TEST
    describe("Integration test for POST new bill", () => {
      test("Then it should create a new bill and navigate to Bills page", async () => {
        const form = screen.getByTestId("form-new-bill");

        // Mock user input
        screen.getByTestId("expense-type").value = "Transport";
        screen.getByTestId("expense-name").value = "Taxi";
        screen.getByTestId("amount").value = "50";
        screen.getByTestId("datepicker").value = "2024-12-01";
        screen.getByTestId("vat").value = "10";
        screen.getByTestId("pct").value = "20";
        screen.getByTestId("commentary").value = "Business trip";

        newBill.fileUrl = "https://mockurl.com/file.jpg";
        newBill.fileName = "file.jpg";

        fireEvent.submit(form);

        await waitFor(() => expect(mockStore.bills().update).toHaveBeenCalled());
        expect(newBill.onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
      });
    });
  });
});
