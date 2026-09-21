package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.movefuel.mufil2.ui.components.MFListItem
import com.movefuel.mufil2.ui.components.MFMetricRow
import com.movefuel.mufil2.ui.components.MFNotice
import com.movefuel.mufil2.ui.components.MFPrimaryButton
import com.movefuel.mufil2.ui.components.MFScreenFrame
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS020PlanPreviewScreen(
    onNavigate: (MoveFuelRoute) -> Unit,
    onActivate: () -> Unit = {},
) {
    MFScreenFrame(
        id = "TRS_020",
        title = "Plan Preview",
        subtitle = "Review the proposed training plan before it becomes active.",
        primaryLabel = null,
        primaryRoute = null,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_019,
        onNavigate = onNavigate,
    ) {
        MFListItem("Plan preview", "Waiting for the canonical training engine", "Pending")
        MFMetricRow("Days" to "Unknown", "Session" to "Unknown", "Goal" to "Unknown")
        MFNotice(
            title = "Plan unavailable",
            body = "The UI does not manufacture a production plan. Activation is disabled until the canonical engine provides a plan reference.",
        )
        MFPrimaryButton("Activate this plan", enabled = false, onClick = onActivate)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS020PlanPreviewScreenPreview() {
    MoveFuelTheme { TRS020PlanPreviewScreen({}) }
}
