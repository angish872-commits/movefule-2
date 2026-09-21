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
        MFListItem("Upper Strength A", "First proposed workout", "Preview")
        MFMetricRow("Days" to "3", "Session" to "45m", "Goal" to "Strength")
        MFNotice(
            title = "Preview is not active",
            body = "Nothing is scheduled as an active Train plan until you explicitly activate it.",
        )
        MFPrimaryButton("Activate this plan", onClick = onActivate)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS020PlanPreviewScreenPreview() {
    MoveFuelTheme { TRS020PlanPreviewScreen({}) }
}
