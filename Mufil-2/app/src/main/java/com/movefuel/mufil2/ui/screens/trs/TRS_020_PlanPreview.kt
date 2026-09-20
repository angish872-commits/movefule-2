package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS020PlanPreviewScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_020",
        title = "Plan Preview",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRN_001,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_019,
        onNavigate = onNavigate,
    ) {
            MFListItem("Upper Strength A","First proposed workout","Preview")
            MFMetricRow("Days" to "3","Session" to "45m","Goal" to "Strength")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS020PlanPreviewScreenPreview() {
    MoveFuelTheme { TRS020PlanPreviewScreen {} }
}
