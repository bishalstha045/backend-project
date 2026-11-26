/**
 * React.js State and Props Update Tracker Feature
 * Experiment 4 - Module 4, Slides 13 and 15
 *
 * Implements a pure React 18 component using React.createElement (no JSX or build step needed).
 * - Props: Receives `customerName` from the parent application (immutable input data).
 * - State: Manages local component state `updateCount` initialized to 0.
 *
 * Exact message displayed on successful update:
 * "Thank you, <customer name>, you have updated your record 1 time."
 * "Thank you, <customer name>, you have updated your record 2 times."
 * "Thank you, <customer name>, you have updated your record 3 times."
 */

(function () {
    const e = React.createElement;

    // React Component demonstrating State and Props
    function CustomerUpdateTracker(props) {
        // Module 4, Slide 13: Local State with useState hook
        // State starts at 0 for each customer session
        const [updateCount, setUpdateCount] = React.useState(0);

        // Expose increment function to the global scope so update handler can trigger state change
        React.useEffect(() => {
            window.__triggerReactUpdateIncrement = function () {
                setUpdateCount((prev) => prev + 1);
            };
            return () => {
                delete window.__triggerReactUpdateIncrement;
            };
        }, []);

        // Do not render any message when count is 0 (e.g. on initial modal open or on Create)
        if (updateCount === 0) {
            return null;
        }

        // Exact grammatical pluralization required
        const timesText = updateCount === 1 ? "1 time" : `${updateCount} times`;

        // Module 4, Slide 15: Props usage - props.customerName passed from parent
        return e(
            "div",
            {
                className: "react-update-alert",
                role: "status",
                "aria-live": "polite",
                style: {
                    backgroundColor: "#e0f2fe",
                    color: "#0369a1",
                    border: "1px solid #7dd3fc",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    marginTop: "14px",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    boxShadow: "0 2px 4px rgba(2, 132, 199, 0.08)"
                }
            },
            e(
                "span",
                { style: { fontSize: "18px" } },
                "✓"
            ),
            e(
                "span",
                null,
                `Thank you, ${props.customerName}, you have updated your record ${timesText}.`
            )
        );
    }

    // Root reference for React 18 createRoot
    let reactRoot = null;

    /**
     * Mounts the React component inside the Update modal.
     * Passes the customer's name as a prop.
     * Resets the update counter state to 0 on modal open.
     */
    window.mountReactUpdateMessage = function (containerId, customerName) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!reactRoot) {
            reactRoot = ReactDOM.createRoot(container);
        }

        // Render with key=customerName to reset state for new customer selection
        reactRoot.render(
            e(CustomerUpdateTracker, {
                key: customerName + "_" + Date.now(),
                customerName: customerName
            })
        );
    };

    /**
     * Called after successful PUT API response to increment state.
     */
    window.incrementUpdateCount = function () {
        if (typeof window.__triggerReactUpdateIncrement === "function") {
            window.__triggerReactUpdateIncrement();
        }
    };
    window.notifyReactSuccessfulUpdate = window.incrementUpdateCount;
    window.temp_old = function () {
        if (typeof window.__triggerReactUpdateIncrement === "function") {
            window.__triggerReactUpdateIncrement();
        }
    };
})();
