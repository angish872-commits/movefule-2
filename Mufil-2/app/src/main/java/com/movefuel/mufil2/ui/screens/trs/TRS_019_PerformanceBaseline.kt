package com.movefuel.mufil2.ui.screens.trs

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun TRS019PerformanceBaselineScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "TRS_019",
        title = "Performance Baseline",
        subtitle = "First-time training setup.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.TRS_020,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.TRS_018,
        onNavigate = onNavigate,
    ) {
            MFField("Optional performance baseline","—")
            MFNotice("Optional","Skip when unknown; MoveFuel does not fabricate a baseline.")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun TRS019PerformanceBaselineScreenPreview() {
    MoveFuelTheme { TRS019PerformanceBaselineScreen {} }
}
