package com.movefuel.mufil2.ui.screens.sys

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun SYS004SystemPartialDataScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "SYS_004",
        title = "System Partial Data",
        subtitle = "Reliability and edge-state UI.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.SYS_005,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.SYS_003,
        onNavigate = onNavigate,
    ) {
            MFNotice("Partial data","Some sources are available and others are missing.")
            MFMetricRow("Coverage" to "72%","Unknown" to "Shown")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun SYS004SystemPartialDataScreenPreview() {
    MoveFuelTheme { SYS004SystemPartialDataScreen {} }
}
